import { writeFile, readFile, pathExists, remove, ensureDir } from '../utils/index.js';
import { join, dirname } from 'node:path';
import { hostname } from 'node:os';
import { unlinkSync, existsSync } from 'node:fs';

/**
 * Interface for Node.js file system errors
 */
interface NodeError extends Error {
  code?: string;
}

/**
 * Dev server lock information stored in the lock file.
 */
interface DevServerLock {
  pid: number;
  timestamp: string;
  hostname?: string;
}

/**
 * Manages dev server locking to prevent multiple dev servers from running in the same directory.
 * Uses a simple file-based locking mechanism with process ID tracking.
 */
export class DevServerLockManager {
  private lockPath: string;
  private isLocked = false;
  private cleanupHandlersRegistered = false;

  constructor(cacheDir: string) {
    this.lockPath = join(cacheDir, '.dev-server-lock');
  }

  /**
   * Attempts to acquire a dev server lock.
   * Throws an error if another dev server is already running.
   *
   * @throws {Error} When lock cannot be acquired
   *
   * @example
   * ```typescript
   * const lockManager = new DevServerLockManager('.stati');
   * try {
   *   await lockManager.acquireLock();
   *   // Start dev server
   * } finally {
   *   await lockManager.releaseLock();
   * }
   * ```
   */
  async acquireLock(): Promise<void> {
    try {
      // Check if lock file exists
      if (await pathExists(this.lockPath)) {
        const existingLock = await this.readLockFile();

        if (existingLock) {
          // Check if the process is still running
          if (await this.isProcessRunning(existingLock.pid)) {
            const hostname = existingLock.hostname || 'unknown';
            const isSameHost = hostname === this.getHostname();
            const location = isSameHost ? 'this machine' : `${hostname}`;

            throw new Error(
              `A dev server is already running in this directory (PID ${existingLock.pid} on ${location}, started ${existingLock.timestamp}).\n` +
                `Please stop the existing dev server before starting a new one.\n` +
                `If you're sure no dev server is running, delete: ${this.lockPath}`,
            );
          } else {
            // Process is dead, remove stale lock
            console.warn(
              `Removing stale dev server lock (PID ${existingLock.pid} no longer running)`,
            );
            await this.forceRemoveLock();
          }
        }
      }

      // Try to create the lock
      await this.createLockFile();
      this.isLocked = true;

      // Register cleanup handlers to ensure lock is released on process exit
      this.registerCleanupHandlers();
    } catch (error) {
      const nodeError = error as NodeError;

      if (nodeError.code === 'EEXIST') {
        throw new Error(
          `Another dev server is starting in this directory.\n` +
            `Please wait a moment and try again, or delete: ${this.lockPath}`,
        );
      }

      throw error;
    }
  }

  /**
   * Releases the dev server lock if this process owns it.
   *
   * @example
   * ```typescript
   * await lockManager.releaseLock();
   * ```
   */
  async releaseLock(): Promise<void> {
    if (!this.isLocked) {
      return;
    }

    try {
      // Verify we still own the lock before removing it
      const currentLock = await this.readLockFile();
      if (currentLock && currentLock.pid === process.pid) {
        await remove(this.lockPath);
      }
    } catch (error) {
      // Don't throw on release errors, just warn
      console.warn(
        `Warning: Failed to release dev server lock: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isLocked = false;
    }
  }

  /**
   * Checks if a dev server lock is currently held by any process.
   *
   * @returns True if a lock exists and the owning process is running
   */
  async isLockHeld(): Promise<boolean> {
    try {
      if (!(await pathExists(this.lockPath))) {
        return false;
      }

      const lock = await this.readLockFile();
      if (!lock) {
        return false;
      }

      return await this.isProcessRunning(lock.pid);
    } catch {
      return false;
    }
  }

  /**
   * Gets information about the current lock holder.
   *
   * @returns Lock information or null if no lock exists
   */
  async getLockInfo(): Promise<DevServerLock | null> {
    try {
      if (!(await pathExists(this.lockPath))) {
        return null;
      }

      return await this.readLockFile();
    } catch {
      return null;
    }
  }

  /**
   * Force removes the lock file without checking ownership.
   * Should only be used in error recovery scenarios.
   */
  private async forceRemoveLock(): Promise<void> {
    try {
      await remove(this.lockPath);
    } catch {
      // Ignore errors when force removing
    }
  }

  /**
   * Creates a new lock file with current process information.
   */
  private async createLockFile(): Promise<void> {
    const lockInfo: DevServerLock = {
      pid: process.pid,
      timestamp: new Date().toISOString(),
      hostname: this.getHostname(),
    };

    // Ensure the cache directory exists before creating the lock file
    await ensureDir(dirname(this.lockPath));

    // Use 'wx' flag to create file exclusively (fails if exists)
    await writeFile(this.lockPath, JSON.stringify(lockInfo, null, 2), { flag: 'wx' });
  }

  /**
   * Reads and parses the lock file.
   */
  private async readLockFile(): Promise<DevServerLock | null> {
    try {
      const content = await readFile(this.lockPath, 'utf-8');
      if (!content) {
        return null;
      }
      return JSON.parse(content) as DevServerLock;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a process with the given PID is currently running.
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // On Unix systems, sending signal 0 checks if process exists without affecting it
      process.kill(pid, 0);
      return true;
    } catch (error) {
      const nodeError = error as NodeError;
      // ESRCH means process doesn't exist
      return nodeError.code !== 'ESRCH';
    }
  }

  /**
   * Gets the hostname for lock identification.
   */
  private getHostname(): string {
    try {
      return hostname();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Registers process exit handlers to ensure lock is released.
   * This prevents accidentally leaving the lock file behind.
   */
  private registerCleanupHandlers(): void {
    if (this.cleanupHandlersRegistered) {
      return;
    }

    this.cleanupHandlersRegistered = true;

    const cleanup = async () => {
      await this.releaseLock();
    };

    // Handle various exit scenarios
    process.on('exit', () => {
      // Synchronous cleanup on exit
      if (this.isLocked) {
        try {
          if (existsSync(this.lockPath)) {
            unlinkSync(this.lockPath);
          }
        } catch {
          // Ignore errors during synchronous cleanup
        }
      }
    });

    // Handle Ctrl+C
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    // Handle kill command
    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await cleanup();
      process.exit(1);
    });
  }
}
