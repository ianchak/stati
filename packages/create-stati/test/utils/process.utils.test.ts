import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  spawnProcess,
  isCommandAvailable,
  ProcessExitError,
} from '../../src/utils/process.utils.js';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

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

      await expect(spawnProcess('echo', ['test'])).resolves.toBe('');

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

    it('should capture stdout with pipe stdio, also when the process fails', async () => {
      const mockOutput = (output: string, code: number) => {
        const stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
        const stdin = { end: vi.fn() };
        const stderr = { resume: vi.fn() };
        const child = {
          stdin,
          stdout,
          stderr,
          on: vi.fn((event, callback) => {
            if (event === 'exit') {
              scheduleCallback(() => {
                stdout.emit('data', output);
                callback(code);
              });
            }
          }),
          kill: vi.fn(),
        };
        return child as unknown as ChildProcess;
      };

      const okChild = mockOutput('[{"status":"installed"}]', 0);
      vi.mocked(spawn).mockReturnValueOnce(okChild);
      await expect(spawnProcess('npx', ['skills'], { stdio: 'pipe' })).resolves.toBe(
        '[{"status":"installed"}]',
      );
      expect(okChild.stdin!.end).toHaveBeenCalled();
      expect(okChild.stderr!.resume).toHaveBeenCalled();

      vi.mocked(spawn).mockReturnValueOnce(mockOutput('[{"status":"failed"}]', 1));
      const error = await spawnProcess('npx', ['skills'], { stdio: 'pipe' }).catch((e) => e);
      expect(error).toBeInstanceOf(ProcessExitError);
      expect(error).toMatchObject({
        message: 'npx exited with code 1',
        code: 1,
        stdout: '[{"status":"failed"}]',
      });
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
      const rejection = expect(promise).rejects.toThrow('Process timed out after 1000ms');

      // Without a grace period it rejects as soon as the process is stopped
      vi.advanceTimersByTime(1000);

      await rejection;

      expect(mockChild.kill).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should force-kill a timed-out process that outlives the grace period', async () => {
      const mockChild = {
        on: vi.fn(),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);
      vi.useFakeTimers();

      let settled = false;
      const promise = spawnProcess('long-command', [], { timeout: 1000, killGracePeriod: 500 });
      promise.catch(() => {}).finally(() => (settled = true));

      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(mockChild.kill).toHaveBeenCalledWith();
      expect(settled).toBe(false);

      vi.advanceTimersByTime(500);
      await expect(promise).rejects.toThrow('Process timed out after 1000ms');
      expect(mockChild.kill).toHaveBeenLastCalledWith('SIGKILL');

      vi.useRealTimers();
    });

    it('should wait for a timed-out process to exit before rejecting', async () => {
      let exit: (code: number | null) => void = () => {};
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') exit = callback;
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValue(mockChild);
      vi.useFakeTimers();

      let settled = false;
      const promise = spawnProcess('long-command', [], { timeout: 1000, killGracePeriod: 5000 });
      promise.catch(() => {}).finally(() => (settled = true));

      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(mockChild.kill).toHaveBeenCalled();
      expect(settled).toBe(false);

      // Killed processes exit with a signal or a non-zero code; it's still reported as a timeout
      exit(null);
      await expect(promise).rejects.toThrow('Process timed out after 1000ms');

      vi.useRealTimers();
    });

    it('should kill the whole process tree with taskkill on Windows', async () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
      Object.defineProperty(process, 'platform', { ...originalPlatform, value: 'win32' });

      let exit: (code: number | null) => void = () => {};
      const mockChild = {
        pid: 4321,
        on: vi.fn((event, callback) => {
          if (event === 'exit') exit = callback;
        }),
        kill: vi.fn(),
      } as unknown as ChildProcess;
      let taskkillExit: (code: number | null) => void = () => {};
      const mockTaskkill = {
        on: vi.fn((event, callback) => {
          if (event === 'exit') taskkillExit = callback;
        }),
      } as unknown as ChildProcess;

      vi.mocked(spawn).mockReturnValueOnce(mockChild).mockReturnValueOnce(mockTaskkill);
      vi.useFakeTimers();

      try {
        const promise = spawnProcess('npx', ['skills'], { timeout: 1000, killGracePeriod: 5000 });
        vi.advanceTimersByTime(1000);

        expect(spawn).toHaveBeenLastCalledWith('taskkill', ['/pid', '4321', '/T', '/F'], {
          stdio: 'ignore',
        });
        expect(mockChild.kill).not.toHaveBeenCalled();

        // When taskkill fails, at least the shell is stopped
        taskkillExit(128);
        expect(mockChild.kill).toHaveBeenCalled();

        exit(1);
        await expect(promise).rejects.toThrow('Process timed out after 1000ms');
      } finally {
        Object.defineProperty(process, 'platform', originalPlatform);
        vi.useRealTimers();
      }
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
