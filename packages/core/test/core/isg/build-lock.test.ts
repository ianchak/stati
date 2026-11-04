import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { BuildLockManager, withBuildLock } from '../../../src/core/isg/build-lock.js';
import { DevServerLockManager } from '../../../src/core/isg/dev-server-lock.js';
import { remove } from '../../../src/core/utils/index.js';
import type { Logger } from '../../../src/types/index.js';

// Removes files as it does without the mock, unless a test makes it fail
vi.mock('../../../src/core/utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/core/utils/index.js')>();
  return { ...actual, remove: vi.fn(actual.remove) };
});

const mockRemove = vi.mocked(remove);

const createLogger = (): Logger => ({
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  status: vi.fn(),
  building: vi.fn(),
  processing: vi.fn(),
  stats: vi.fn(),
});

/** A PID no process has: Windows PIDs are multiples of 4 */
const deadPid = 999999;

/** Writes a lock file that a process which is no longer running left behind */
const writeStaleLock = (lockPath: string) =>
  writeFile(lockPath, JSON.stringify({ pid: deadPid, timestamp: new Date().toISOString() }));

describe('BuildLockManager', () => {
  let testDir: string;
  let lockManager: BuildLockManager;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'stati-lock-test-'));
    lockManager = new BuildLockManager(testDir);
  });

  afterEach(async () => {
    await lockManager.releaseLock();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should acquire and release lock successfully', async () => {
    await lockManager.acquireLock();
    expect(await lockManager.isLockHeld()).toBe(true);

    const lockInfo = await lockManager.getLockInfo();
    expect(lockInfo).toBeTruthy();
    expect(lockInfo?.pid).toBe(process.pid);

    await lockManager.releaseLock();
    expect(await lockManager.isLockHeld()).toBe(false);
  });

  it('should prevent concurrent lock acquisition', async () => {
    await lockManager.acquireLock();

    const secondLock = new BuildLockManager(testDir);
    await expect(secondLock.acquireLock({ timeout: 2000 })).rejects.toThrow(/timed out/);
  });

  it('should force acquire lock when force option is true', async () => {
    await lockManager.acquireLock();

    const logger = createLogger();
    const secondLock = new BuildLockManager(testDir, logger);
    await secondLock.acquireLock({ force: true });

    expect(await secondLock.isLockHeld()).toBe(true);
    expect(logger.warning).toHaveBeenCalledWith(
      'Force acquiring build lock, removing existing lock',
    );
    await secondLock.releaseLock();
  });

  it('should remove a stale lock and warn through its logger', async () => {
    await writeStaleLock(join(testDir, '.build-lock'));

    const logger = createLogger();
    const newLock = new BuildLockManager(testDir, logger);
    await newLock.acquireLock();

    expect(await newLock.isLockHeld()).toBe(true);
    expect(logger.warning).toHaveBeenCalledWith(
      `Removing stale build lock (PID ${deadPid} no longer running)`,
    );
    await newLock.releaseLock();
  });

  it('should warn on the console without a logger', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await writeStaleLock(join(testDir, '.build-lock'));

    await lockManager.acquireLock();

    expect(warn).toHaveBeenCalledWith(
      `Removing stale build lock (PID ${deadPid} no longer running)`,
    );
  });

  it.each([new Error('EBUSY: resource busy'), 'EBUSY: resource busy'])(
    'should warn through its logger when the lock cannot be released (%s)',
    async (failure) => {
      const logger = createLogger();
      const newLock = new BuildLockManager(testDir, logger);
      await newLock.acquireLock();
      mockRemove.mockRejectedValueOnce(failure);

      await newLock.releaseLock();

      expect(logger.warning).toHaveBeenCalledWith(
        'Failed to release build lock: EBUSY: resource busy',
      );
      // The lock counts as released, so releasing again does nothing
      await newLock.releaseLock();
      expect(mockRemove).toHaveBeenCalledTimes(1);
    },
  );

  it('should work with withBuildLock helper', async () => {
    let executed = false;

    await withBuildLock(testDir, async () => {
      executed = true;
      expect(await lockManager.isLockHeld()).toBe(true);
    });

    expect(executed).toBe(true);
    expect(await lockManager.isLockHeld()).toBe(false);
  });

  it('should give withBuildLock its logger and lock options', async () => {
    await lockManager.acquireLock();
    const logger = createLogger();

    const result = await withBuildLock(testDir, async () => 'built', { force: true, logger });

    expect(result).toBe('built');
    expect(logger.warning).toHaveBeenCalledWith(
      'Force acquiring build lock, removing existing lock',
    );
  });

  it('should release lock even if build function throws', async () => {
    await expect(
      withBuildLock(testDir, async () => {
        throw new Error('Build failed');
      }),
    ).rejects.toThrow('Build failed');

    expect(await lockManager.isLockHeld()).toBe(false);
  });
});

describe('DevServerLockManager', () => {
  let testDir: string;
  let devLock: DevServerLockManager;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'stati-dev-lock-test-'));
    devLock = new DevServerLockManager(testDir);
  });

  afterEach(async () => {
    await devLock.releaseLock();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should acquire and release dev server lock successfully', async () => {
    await devLock.acquireLock();
    expect(await devLock.isLockHeld()).toBe(true);

    const lockInfo = await devLock.getLockInfo();
    expect(lockInfo).toBeTruthy();
    expect(lockInfo?.pid).toBe(process.pid);

    await devLock.releaseLock();
    expect(await devLock.isLockHeld()).toBe(false);
  });

  it('should prevent multiple dev servers in same directory', async () => {
    await devLock.acquireLock();

    const secondDevLock = new DevServerLockManager(testDir);
    await expect(secondDevLock.acquireLock()).rejects.toThrow(/already running/);
  });

  it('should provide informative error message with PID and timestamp', async () => {
    await devLock.acquireLock();

    const secondDevLock = new DevServerLockManager(testDir);
    try {
      await secondDevLock.acquireLock();
      expect.fail('Should have thrown an error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain(`PID ${process.pid}`);
      expect(message).toContain('already running');
    }
  });

  it('should clean up stale locks from dead processes', async () => {
    await writeStaleLock(join(testDir, '.dev-server-lock'));

    // Should detect stale lock, warn through its logger and acquire successfully
    const logger = createLogger();
    const newLock = new DevServerLockManager(testDir, logger);
    await newLock.acquireLock();
    expect(await newLock.isLockHeld()).toBe(true);
    expect(logger.warning).toHaveBeenCalledWith(
      `Removing stale dev server lock (PID ${deadPid} no longer running)`,
    );
    await newLock.releaseLock();
  });

  it('should warn on the console without a logger', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await writeStaleLock(join(testDir, '.dev-server-lock'));

    await devLock.acquireLock();

    expect(warn).toHaveBeenCalledWith(
      `Removing stale dev server lock (PID ${deadPid} no longer running)`,
    );
  });

  it('should allow multiple dev servers in different directories', async () => {
    const testDir2 = await mkdtemp(join(tmpdir(), 'stati-dev-lock-test-2-'));

    try {
      await devLock.acquireLock();
      expect(await devLock.isLockHeld()).toBe(true);

      const devLock2 = new DevServerLockManager(testDir2);
      await devLock2.acquireLock();
      expect(await devLock2.isLockHeld()).toBe(true);

      await devLock2.releaseLock();
    } finally {
      await rm(testDir2, { recursive: true, force: true });
    }
  });

  it('should handle concurrent lock attempts gracefully', async () => {
    await devLock.acquireLock();

    // Try to acquire lock from multiple instances simultaneously
    const locks = [
      new DevServerLockManager(testDir),
      new DevServerLockManager(testDir),
      new DevServerLockManager(testDir),
    ];

    const results = await Promise.allSettled(locks.map((lock) => lock.acquireLock()));

    // All should be rejected
    results.forEach((result) => {
      expect(result.status).toBe('rejected');
    });
  });

  it('should return null for getLockInfo when no lock file exists', async () => {
    const lockInfo = await devLock.getLockInfo();
    expect(lockInfo).toBeNull();
  });

  it('should return false for isLockHeld when no lock file exists', async () => {
    const isHeld = await devLock.isLockHeld();
    expect(isHeld).toBe(false);
  });

  it('should release lock gracefully when not holding lock', async () => {
    // Should not throw when releasing without acquiring first
    await expect(devLock.releaseLock()).resolves.not.toThrow();
  });

  it('should handle malformed lock file gracefully', async () => {
    // Create a malformed lock file
    const lockPath = join(testDir, '.dev-server-lock');
    const { writeFile, mkdir, unlink } = await import('node:fs/promises');
    await mkdir(testDir, { recursive: true });
    await writeFile(lockPath, 'not-valid-json');

    const newLock = new DevServerLockManager(testDir);

    // getLockInfo should return null for malformed file
    const lockInfo = await newLock.getLockInfo();
    expect(lockInfo).toBeNull();

    // isLockHeld should return false for malformed file
    const isHeld = await newLock.isLockHeld();
    expect(isHeld).toBe(false);

    // Remove the malformed lock file before acquiring
    await unlink(lockPath);

    // Should be able to acquire lock since the malformed one is removed
    await newLock.acquireLock();
    expect(await newLock.isLockHeld()).toBe(true);
    await newLock.releaseLock();
  });

  it('should handle empty lock file gracefully', async () => {
    const lockPath = join(testDir, '.dev-server-lock');
    const { writeFile, mkdir, unlink } = await import('node:fs/promises');
    await mkdir(testDir, { recursive: true });
    await writeFile(lockPath, '');

    const newLock = new DevServerLockManager(testDir);

    // Check that empty file is handled
    const lockInfo = await newLock.getLockInfo();
    expect(lockInfo).toBeNull();

    // Remove the empty lock file before acquiring
    await unlink(lockPath);

    // Should be able to acquire lock
    await newLock.acquireLock();
    expect(await newLock.isLockHeld()).toBe(true);
    await newLock.releaseLock();
  });

  it('should include hostname in lock file', async () => {
    await devLock.acquireLock();
    const lockInfo = await devLock.getLockInfo();

    expect(lockInfo).toBeTruthy();
    expect(lockInfo?.hostname).toBeDefined();
    expect(typeof lockInfo?.hostname).toBe('string');

    await devLock.releaseLock();
  });

  it('should include timestamp in lock file', async () => {
    await devLock.acquireLock();
    const lockInfo = await devLock.getLockInfo();

    expect(lockInfo).toBeTruthy();
    expect(lockInfo?.timestamp).toBeDefined();
    // Timestamp should be a valid ISO string
    const date = new Date(lockInfo!.timestamp);
    expect(date.getTime()).not.toBeNaN();

    await devLock.releaseLock();
  });

  it('should display different location message for different host', async () => {
    // Create a lock with a different hostname
    const lockPath = join(testDir, '.dev-server-lock');
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(testDir, { recursive: true });
    await writeFile(
      lockPath,
      JSON.stringify({
        pid: process.pid, // Same PID so it looks running
        timestamp: new Date().toISOString(),
        hostname: 'different-host', // Different hostname
      }),
    );

    const newLock = new DevServerLockManager(testDir);
    try {
      await newLock.acquireLock();
      expect.fail('Should have thrown an error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Should mention the different host
      expect(message).toContain('different-host');
      expect(message).toContain('already running');
    }
  });

  it('should display same machine location for same host', async () => {
    await devLock.acquireLock();

    const secondDevLock = new DevServerLockManager(testDir);
    try {
      await secondDevLock.acquireLock();
      expect.fail('Should have thrown an error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Should mention "this machine" for same host
      expect(message).toContain('this machine');
    }
  });

  it('should handle lock file with unknown hostname gracefully', async () => {
    // Create a lock without hostname
    const lockPath = join(testDir, '.dev-server-lock');
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(testDir, { recursive: true });
    await writeFile(
      lockPath,
      JSON.stringify({
        pid: process.pid, // Same PID so it looks running
        timestamp: new Date().toISOString(),
        // No hostname
      }),
    );

    const newLock = new DevServerLockManager(testDir);
    try {
      await newLock.acquireLock();
      expect.fail('Should have thrown an error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Should handle missing hostname
      expect(message).toContain('already running');
    }
  });

  it.each([new Error('EBUSY: resource busy'), 'EBUSY: resource busy'])(
    'should warn through its logger when the lock cannot be released (%s)',
    async (failure) => {
      const logger = createLogger();
      const newLock = new DevServerLockManager(testDir, logger);
      await newLock.acquireLock();
      mockRemove.mockRejectedValueOnce(failure);

      await newLock.releaseLock();

      expect(logger.warning).toHaveBeenCalledWith(
        'Failed to release dev server lock: EBUSY: resource busy',
      );
      // The lock counts as released, so releasing again does nothing
      await newLock.releaseLock();
      expect(mockRemove).toHaveBeenCalledTimes(1);
    },
  );

  it('should release a lock whose file is already gone without warning', async () => {
    const logger = createLogger();
    const newLock = new DevServerLockManager(testDir, logger);
    await newLock.acquireLock();
    await rm(join(testDir, '.dev-server-lock'));

    await newLock.releaseLock();

    expect(logger.warning).not.toHaveBeenCalled();
  });

  it('should handle isLockHeld with error gracefully', async () => {
    // Test the error catch path in isLockHeld
    const newLock = new DevServerLockManager(testDir);
    const isHeld = await newLock.isLockHeld();
    expect(isHeld).toBe(false);
  });

  it('should handle getLockInfo with error gracefully', async () => {
    // Test the error catch path in getLockInfo
    const newLock = new DevServerLockManager(testDir);
    const info = await newLock.getLockInfo();
    expect(info).toBeNull();
  });
});
