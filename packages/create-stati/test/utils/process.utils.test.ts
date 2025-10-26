import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawnProcess, isCommandAvailable } from '../../src/utils/process.utils.js';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

vi.mock('child_process');

// Helper to safely schedule callbacks
const scheduleCallback = (callback: () => void, delay = 10) => {
  global.setTimeout(callback, delay);
};

describe('process.utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('spawnProcess', () => {
    it('should spawn process successfully', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(0));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await expect(spawnProcess('echo', ['test'])).resolves.toBeUndefined();

      expect(spawn).toHaveBeenCalledWith('echo', ['test'], {
        cwd: undefined,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });
    });

    it('should spawn process with custom options', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(0));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await spawnProcess('npm', ['install'], {
        cwd: '/test/dir',
        stdio: 'inherit',
      });

      expect(spawn).toHaveBeenCalledWith('npm', ['install'], {
        cwd: '/test/dir',
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
    });

    it('should reject on process error', async () => {
      const mockError = new Error('spawn error');
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            scheduleCallback(() => callback(mockError));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await expect(spawnProcess('invalid-command', [])).rejects.toThrow('spawn error');
    });

    it('should reject on non-zero exit code', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(1));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await expect(spawnProcess('npm', ['test'])).rejects.toThrow('npm exited with code 1');
    });

    it('should handle timeout', async () => {
      const mockChild = {
        on: vi.fn((_event, _callback) => {
          // Never call exit callback to simulate hanging process
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      // Use fake timers for timeout test
      vi.useFakeTimers();

      const promise = spawnProcess('long-command', [], { timeout: 1000 });

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow('Process timed out after 1000ms');

      expect(mockChild.kill).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should clear timeout on successful exit', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(0));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await spawnProcess('echo', ['test'], { timeout: 5000 });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout on error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const mockError = new Error('spawn error');

      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            scheduleCallback(() => callback(mockError));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await expect(spawnProcess('invalid', [], { timeout: 5000 })).rejects.toThrow();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should spawn with pipe stdio', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(0));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      await spawnProcess('echo', ['test'], { stdio: 'pipe' });

      expect(spawn).toHaveBeenCalledWith('echo', ['test'], {
        cwd: undefined,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });
    });
  });

  describe('isCommandAvailable', () => {
    it('should return true for available command', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(0));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await isCommandAvailable('npm');
      expect(result).toBe(true);

      expect(spawn).toHaveBeenCalledWith('npm', ['--version'], {
        cwd: undefined,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });
    });

    it('should return false for unavailable command', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            scheduleCallback(() => callback(new Error('command not found')));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await isCommandAvailable('invalid-command');
      expect(result).toBe(false);
    });

    it('should return false for command with non-zero exit', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(1));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await isCommandAvailable('failing-command');
      expect(result).toBe(false);
    });

    it('should use custom timeout', async () => {
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            scheduleCallback(() => callback(0));
          }
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await isCommandAvailable('npm', 10000);
      expect(result).toBe(true);
    });

    it('should handle timeout and return false', async () => {
      const mockChild = {
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);

      vi.useFakeTimers();

      const promise = isCommandAvailable('slow-command', 1000);

      vi.advanceTimersByTime(1000);

      const result = await promise;
      expect(result).toBe(false);

      vi.useRealTimers();
    });
  });
});
