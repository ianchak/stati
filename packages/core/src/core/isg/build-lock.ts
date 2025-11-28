import { writeFile, readFile, pathExists, remove, ensureDir } from '../utils/index.js';
import { join, dirname } from 'node:path';
import { hostname } from 'node:os';

/**
 * Interface for Node.js file system errors
 */
interface NodeError extends Error {
  code?: string;
}

/**
 * Build lock information stored in the lock file.
 */
interface BuildLock {
  pid: number;
  timestamp: string;
  hostname?: string;
}

/**
 * Manages build process locking to prevent concurrent Stati builds from corrupting cache.
 * Uses a simple file-based locking mechanism with process ID tracking.
 */
export class BuildLockManager {
  private lockPath: string;
  private isLocked = false;

  constructor(cacheDir: string) {
    this.lockPath = join(cacheDir, '.build-lock');
  }

  /**
   * Attempts to acquire a build lock.
   * Throws an error if another build process is already running.
   *
   * @param options - Lock acquisition options
   * @param options.force - Force acquire lock even if another process holds it
   * @param options.timeout - Maximum time to wait for lock in milliseconds
   * @throws {Error} When lock cannot be acquired
   *
   * @example
   * ```typescript
   * const lockManager = new BuildLockManager('.stati');
   * try {
   *   await lockManager.acquireLock();
   *   // Proceed with build
   * } finally {
   *   await lockManager.releaseLock();
   * }
   * ```
   */
  async acquireLock(options: { force?: boolean; timeout?: number } = {}): Promise<void> {
    const { force = false, timeout = 30000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Check if lock file exists
        if (await pathExists(this.lockPath)) {
          const existingLock = await this.readLockFile();

          if (existingLock && !force) {
            // Check if the process is still running
            if (await this.isProcessRunning(existingLock.pid)) {
              // Wait a bit and try again
              await this.sleep(1000);
              continue;
            } else {
              // Process is dead, remove stale lock
              console.warn(`Removing stale build lock (PID ${existingLock.pid} no longer running)`);
              await this.forceRemoveLock();
            }
          } else if (force) {
            console.warn('Force acquiring build lock, removing existing lock');
            await this.forceRemoveLock();
          }
        }

        // Try to create the lock
        await this.createLockFile();
        this.isLocked = true;
        return;
      } catch (error) {
        const nodeError = error as NodeError;

        if (nodeError.code === 'EEXIST') {
          // Another process created the lock between our check and creation
          await this.sleep(1000);
          continue;
        }

        throw new Error(
          `Failed to acquire build lock: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    throw new Error(
      `Build lock acquisition timed out after ${timeout}ms. ` +
        `Another Stati build process may be running. Use --force to override.`,
    );
  }

  /**
   * Releases the build lock if this process owns it.
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
        `Warning: Failed to release build lock: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isLocked = false;
    }
  }

  /**
   * Checks if a build lock is currently held by any process.
   *
   * @returns True if a lock exists and the owning process is running
   *
   * @example
   * ```typescript
   * if (await lockManager.isLocked()) {
   *   console.log('Another build is in progress');
   * }
   * ```
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
  async getLockInfo(): Promise<BuildLock | null> {
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
    const lockInfo: BuildLock = {
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
  private async readLockFile(): Promise<BuildLock | null> {
    try {
      const content = await readFile(this.lockPath, 'utf-8');
      if (!content) {
        return null;
      }
      return JSON.parse(content) as BuildLock;
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
   * Simple sleep utility for polling delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }
}

/**
 * Convenience function to safely execute a build with automatic lock management.
 *
 * @param cacheDir - Path to the cache directory
 * @param buildFn - Function to execute while holding the lock
 * @param options - Lock options
 * @returns Result of the build function
 *
 * @example
 * ```typescript
 * const result = await withBuildLock('.stati', async () => {
 *   // Your build logic here
 *   return await performBuild();
 * });
 * ```
 */
export async function withBuildLock<T>(
  cacheDir: string,
  buildFn: () => Promise<T>,
  options: { force?: boolean; timeout?: number } = {},
): Promise<T> {
  const lockManager = new BuildLockManager(cacheDir);

  try {
    await lockManager.acquireLock(options);
    return await buildFn();
  } finally {
    await lockManager.releaseLock();
  }
}
