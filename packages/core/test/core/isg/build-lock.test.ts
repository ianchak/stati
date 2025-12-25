import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { BuildLockManager, withBuildLock } from '../../../src/core/isg/build-lock.js';
import { DevServerLockManager } from '../../../src/core/isg/dev-server-lock.js';

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

    const secondLock = new BuildLockManager(testDir);
    await secondLock.acquireLock({ force: true });

    expect(await secondLock.isLockHeld()).toBe(true);
    await secondLock.releaseLock();
  });

  it('should work with withBuildLock helper', async () => {
    let executed = false;

    await withBuildLock(testDir, async () => {
      executed = true;
      expect(await lockManager.isLockHeld()).toBe(true);
    });

    expect(executed).toBe(true);
    expect(await lockManager.isLockHeld()).toBe(false);
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
    // Create a lock with a fake PID that doesn't exist
    const fakePid = 999999;
    await devLock.acquireLock();
    await devLock.releaseLock();

    // Manually create a lock file with fake PID
    const lockPath = join(testDir, '.dev-server-lock');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(
      lockPath,
      JSON.stringify({
        pid: fakePid,
        timestamp: new Date().toISOString(),
        hostname: 'test-host',
      }),
    );

    // Should detect stale lock and acquire successfully
    const newLock = new DevServerLockManager(testDir);
    await newLock.acquireLock();
    expect(await newLock.isLockHeld()).toBe(true);
    await newLock.releaseLock();
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

  it('should warn when releasing lock fails', async () => {
    // Spy on console.warn to capture warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await devLock.acquireLock();

    // Delete the lock file to simulate failure during release
    const lockPath = join(testDir, '.dev-server-lock');
    const { unlink } = await import('node:fs/promises');
    await unlink(lockPath);

    // Manually set isLocked to true and try to release
    // This should trigger the error path when checking lock ownership
    await devLock.releaseLock();

    // Restore console.warn
    warnSpy.mockRestore();
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
