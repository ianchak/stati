import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { watchTailwindCSS, stopTailwindWatcher } from '../src/tailwind.js';
import { createLogger } from '../src/logger.js';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');

describe('Tailwind CSS CLI Commands', () => {
  let mockLogger: ReturnType<typeof createLogger>;
  let mockProcess: EventEmitter & {
    stdin: EventEmitter & { end: () => void };
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    exitCode: number | null;
    signalCode: string | null;
    kill: (signal: string) => void;
  };

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    } as unknown as ReturnType<typeof createLogger>;

    // Create mock process
    mockProcess = Object.assign(new EventEmitter(), {
      stdin: Object.assign(new EventEmitter(), { end: vi.fn() }),
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      killed: false,
      exitCode: null,
      signalCode: null,
      kill: vi.fn((signal: string) => {
        mockProcess.killed = true;
        mockProcess.emit('close', signal === 'SIGKILL' ? 1 : 0);
      }),
    });

    vi.mocked(spawn).mockReturnValue(mockProcess as never);
    vi.mocked(existsSync).mockImplementation((path) => {
      // Simulate that tailwindcss executable exists locally
      // This is required because the new behavior throws an error if it's not found
      if (typeof path === 'string' && path.includes('.bin') && path.includes('tailwindcss')) {
        // On Windows, check for .cmd file
        return path.endsWith('.cmd');
      }
      return true;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('watchTailwindCSS', () => {
    it('should start watching CSS files in non-verbose mode', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // Wait for watcher to start
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Watching CSS with Tailwind CSS (non-verbose mode)...\n',
      );
      // Should use local executable (.cmd on Windows)
      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining('tailwindcss'),
        ['-i', 'src/styles.css', '-o', 'public/styles.css', '--watch'],
        expect.objectContaining({ shell: true }),
      );

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should give Tailwind a stdin pipe that stays open while the watcher runs', () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // An inherited stdin can already be closed (background shell), which ends --watch
      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
      );
      expect(mockProcess.stdin.end).not.toHaveBeenCalled();

      // Ending stdin after Tailwind exited fails with EPIPE, which must not crash stati
      expect(() =>
        mockProcess.stdin.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })),
      ).not.toThrow();
    });

    it('should accept Tailwind CSS 4 installed as @tailwindcss/cli', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path).replace(/\\/g, '/');
        if (pathStr.endsWith('node_modules/tailwindcss')) {
          // tailwindcss itself is not hoisted, for example with pnpm
          return false;
        }
        if (pathStr.includes('.bin') && pathStr.includes('tailwindcss')) {
          return !pathStr.endsWith('.cmd');
        }
        return true;
      });

      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      expect(spawn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should report Tailwind as not installed when neither package is found', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path).replace(/\\/g, '/');
        return !(
          pathStr.endsWith('node_modules/tailwindcss') ||
          pathStr.endsWith('node_modules/@tailwindcss/cli')
        );
      });

      expect(() =>
        watchTailwindCSS(
          {
            input: 'src/styles.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).toThrow('Tailwind CSS is not installed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('npm install -D tailwindcss @tailwindcss/cli'),
      );
      expect(spawn).not.toHaveBeenCalled();
    });

    it('should start watching CSS files in verbose mode', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: true,
        },
        mockLogger,
      );

      // Wait for watcher to start
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Watching CSS with Tailwind CSS (verbose mode)...\n',
      );
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('errors only'));

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should suppress informational messages in non-verbose mode', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: false,
        },
        mockLogger,
      );

      // Wait for watcher to start
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
      mockProcess.stderr.emit('data', Buffer.from('Done in 123ms\n'));
      mockProcess.stderr.emit('data', Buffer.from('Rebuilding...\n'));

      // Should not log informational messages in non-verbose mode
      expect(mockLogger.info).not.toHaveBeenCalledWith('Done in 123ms');
      expect(mockLogger.info).not.toHaveBeenCalledWith('Rebuilding...');

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should show all messages in verbose mode', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: true,
        },
        mockLogger,
      );

      // Wait for watcher to start
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
      mockProcess.stderr.emit('data', Buffer.from('Done in 123ms\n'));
      mockProcess.stderr.emit('data', Buffer.from('Rebuilding...\n'));

      // Should log completion messages in verbose mode
      expect(mockLogger.info).toHaveBeenCalledWith('Tailwind done in 123ms');
      // Rebuilding messages are suppressed to reduce chatter

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should always show errors regardless of verbose mode', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // Wait for watcher to start then emit error
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
      mockProcess.stderr.emit('data', Buffer.from('Error: Failed to compile\n'));

      expect(mockLogger.error).toHaveBeenCalledWith('Error: Failed to compile');

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle watcher errors', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // Emit error
      mockProcess.emit('error', new Error('Watcher failed'));

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to start'));
    });

    it('should handle non-zero exit codes', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // Emit close with non-zero code
      mockProcess.emit('close', 1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tailwind CSS watcher exited with code 1. CSS changes are not rebuilt until stati dev restarts.',
      );
    });

    it('should validate input file exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(() =>
        watchTailwindCSS(
          {
            input: 'nonexistent.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).toThrow('Input file not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Input file not found'),
      );
    });

    it('should throw error when tailwindcss executable is not found', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        // Simulate tailwindcss executable not found
        if (typeof path === 'string' && path.includes('.bin') && path.includes('tailwindcss')) {
          return false;
        }
        return true;
      });

      expect(() =>
        watchTailwindCSS(
          {
            input: 'src/styles.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).toThrow('Tailwind CSS not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Tailwind CSS executable not found'),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('npm install -D tailwindcss @tailwindcss/cli'),
      );
    });
  });

  describe('Tailwind CSS 4 output', () => {
    // What @tailwindcss/cli 4.3 writes to a pipe, colors included
    const v4Error =
      '\u001b[31mError:\u001b[39m\n\u001b[2m┌\u001b[22m\n' +
      '\u001b[2m│\u001b[22m Error: Cannot apply unknown utility class `does-not-exist`\n' +
      '\u001b[2m└\u001b[22m\nDone in \u001b[31m3s\u001b[39m\n';

    it('should show an error that arrives with its "Done in" line', () => {
      watchTailwindCSS({ input: 'src/styles.css', output: 'dist/styles.css' }, mockLogger);

      mockProcess.stderr.emit('data', Buffer.from(v4Error));

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error: Cannot apply unknown utility class `does-not-exist`',
      );
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('done in'));
    });

    it('should show the build time after the error in verbose mode', () => {
      watchTailwindCSS(
        { input: 'src/styles.css', output: 'dist/styles.css', verbose: true },
        mockLogger,
      );

      mockProcess.stderr.emit('data', Buffer.from(v4Error));
      mockProcess.stderr.emit('data', Buffer.from('Done in \u001b[32m12ms\u001b[39m\n'));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error: Cannot apply unknown utility class `does-not-exist`',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Tailwind done in 3s');
      expect(mockLogger.info).toHaveBeenCalledWith('Tailwind done in 12ms');
    });

    it('should keep the causes of a nested error', () => {
      watchTailwindCSS({ input: 'src/styles.css', output: 'dist/styles.css' }, mockLogger);

      mockProcess.stderr.emit(
        'data',
        Buffer.from(
          'Error:\n┌\n│ Error: Failed to load plugin\n└\n  Caused by:\n  ┌\n  │ Error: Cannot find module\n  └\n',
        ),
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error: Failed to load plugin\n  Caused by:\n  Error: Cannot find module',
      );
    });

    it('should show a Tailwind CSS 3 error that arrives with the "Rebuilding..." line', () => {
      watchTailwindCSS({ input: 'src/styles.css', output: 'dist/styles.css' }, mockLogger);

      mockProcess.stderr.emit(
        'data',
        Buffer.from(
          '\nRebuilding...\nCssSyntaxError: The `does-not-exist` class does not exist.\n',
        ),
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'CssSyntaxError: The `does-not-exist` class does not exist.',
      );
    });

    it('should not show the version banner', () => {
      watchTailwindCSS(
        { input: 'src/styles.css', output: 'dist/styles.css', verbose: true },
        mockLogger,
      );

      mockProcess.stderr.emit(
        'data',
        Buffer.from(
          '\u001b[3m\u001b[1m\u001b[34m≈\u001b[39m\u001b[22m\u001b[23m tailwindcss \u001b[34mv4.3.3\u001b[39m\n',
        ),
      );

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('tailwindcss v4'));
    });

    it('should strip color codes from stdout in verbose mode', () => {
      watchTailwindCSS(
        { input: 'src/styles.css', output: 'dist/styles.css', verbose: true },
        mockLogger,
      );

      mockProcess.stdout.emit('data', Buffer.from('\u001b[34mbuilt\u001b[39m\n'));

      expect(mockLogger.info).toHaveBeenCalledWith('built');
    });
  });

  describe('watcher lifetime', () => {
    it('should warn when the watcher stops on its own', () => {
      watchTailwindCSS({ input: 'src/styles.css', output: 'dist/styles.css' }, mockLogger);

      // Tailwind exits with code 0 when its stdin closes
      mockProcess.emit('close', 0);

      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Tailwind CSS watcher stopped. CSS changes are not rebuilt until stati dev restarts.',
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should not warn when stati stops the watcher', async () => {
      const proc = watchTailwindCSS(
        { input: 'src/styles.css', output: 'dist/styles.css' },
        mockLogger,
      );

      await stopTailwindWatcher(proc, mockLogger);

      expect(mockLogger.warning).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should not report an exit code while stati stops the watcher', async () => {
      // Tailwind's poll mode exits with 143 on SIGTERM
      vi.mocked(mockProcess.kill).mockImplementation(() => {
        mockProcess.emit('close', 143);
      });
      const proc = watchTailwindCSS(
        { input: 'src/styles.css', output: 'dist/styles.css' },
        mockLogger,
      );

      await stopTailwindWatcher(proc, mockLogger);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warning).not.toHaveBeenCalled();
    });
  });

  describe('stopTailwindWatcher', () => {
    it('should end stdin, send SIGTERM and wait for the watcher to close', async () => {
      const proc = mockProcess as unknown as ChildProcess;

      await stopTailwindWatcher(proc, mockLogger);

      expect(mockProcess.stdin.end).toHaveBeenCalledTimes(1);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).not.toHaveBeenCalledWith('SIGKILL');
      expect(mockLogger.warning).not.toHaveBeenCalled();
    });

    it('should resolve at once when the watcher has already exited', async () => {
      mockProcess.exitCode = 0;

      await stopTailwindWatcher(mockProcess as unknown as ChildProcess, mockLogger);

      expect(mockProcess.stdin.end).not.toHaveBeenCalled();
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('should resolve at once when the watcher was ended by a signal', async () => {
      mockProcess.signalCode = 'SIGINT';

      await stopTailwindWatcher(mockProcess as unknown as ChildProcess, mockLogger);

      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('should kill a watcher that does not exit in time', async () => {
      // A watcher that ignores SIGTERM and never closes
      vi.mocked(mockProcess.kill).mockImplementation(() => {});

      await stopTailwindWatcher(mockProcess as unknown as ChildProcess, mockLogger, 10);

      expect(mockLogger.warning).toHaveBeenCalledWith(
        'Tailwind watcher did not exit cleanly, forcing shutdown',
      );
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('Unix path handling', () => {
    it('should use Unix executable in watchTailwindCSS when .cmd not found', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path);

        // Simulate Unix environment - no .cmd file
        if (pathStr.includes('.bin') && pathStr.includes('tailwindcss')) {
          return !pathStr.endsWith('.cmd');
        }

        return true;
      });

      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      expect(spawn).toHaveBeenCalledWith(
        expect.stringMatching(/tailwindcss$/),
        ['-i', 'src/styles.css', '-o', 'public/styles.css', '--watch'],
        expect.objectContaining({ shell: true }),
      );

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle resolution errors in watchTailwindCSS', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path);

        if (pathStr.includes('.bin') && pathStr.includes('tailwindcss')) {
          // Throw a different error (not our custom one)
          throw new Error('Permission denied');
        }

        return true;
      });

      expect(() =>
        watchTailwindCSS(
          {
            input: 'src/styles.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).toThrow('Failed to locate Tailwind CSS executable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to locate Tailwind CSS executable'),
      );
    });
  });

  describe('watchTailwindCSS edge cases', () => {
    it('should handle empty stdout messages', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: true,
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      // Emit empty message
      mockProcess.stdout.emit('data', Buffer.from('   \n'));
      mockProcess.stdout.emit('data', Buffer.from(''));

      // Should not log empty messages
      const infoCalls = vi.mocked(mockLogger.info).mock.calls;
      const emptyMessages = infoCalls.filter((call) => !call[0] || call[0].trim() === '');
      expect(emptyMessages.length).toBe(0);

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle empty stderr messages', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: true,
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      // Emit empty messages
      mockProcess.stderr.emit('data', Buffer.from('   \n'));
      mockProcess.stderr.emit('data', Buffer.from(''));

      // Should handle gracefully without errors
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should filter out shutdown messages', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: true,
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      mockProcess.stderr.emit('data', Buffer.from('Stopping watcher...\n'));
      mockProcess.stderr.emit('data', Buffer.from('Shutting down gracefully\n'));

      // Should not log shutdown messages
      const infoCalls = vi.mocked(mockLogger.info).mock.calls;
      const shutdownMessages = infoCalls.filter(
        (call) => call[0] && (call[0].includes('Stopping') || call[0].includes('Shutting')),
      );
      expect(shutdownMessages.length).toBe(0);

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle close with null exit code', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // Emit close with null code (normal termination by signal)
      mockProcess.emit('close', null);

      // Should not log error for null exit code
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('exited with code'),
      );
    });

    it('should fallback to console when logger fails on stdout', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let callCount = 0;
      // Make logger.info throw an error only after the initial startup message
      vi.mocked(mockLogger.info).mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          throw new Error('Logger failed');
        }
      });

      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: true,
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
      mockProcess.stdout.emit('data', Buffer.from('Test message\n'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Logger error processing stdout:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
      mockProcess.emit('close', 0);
    });

    it('should fallback to console when logger fails on stderr', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make logger.error throw an error
      vi.mocked(mockLogger.error).mockImplementation(() => {
        throw new Error('Logger failed');
      });

      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
      mockProcess.stderr.emit('data', Buffer.from('Error: Test error\n'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Logger error processing stderr:',
        expect.any(Error),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Original message:', expect.any(String));

      consoleErrorSpy.mockRestore();
      mockProcess.emit('close', 0);
    });

    it('should fallback to console when logger fails on error event', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make logger.error throw an error
      vi.mocked(mockLogger.error).mockImplementation(() => {
        throw new Error('Logger failed');
      });

      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      mockProcess.emit('error', new Error('Process error'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to start Tailwind CSS:',
        'Process error',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Make sure Tailwind CSS is installed: npm install -D tailwindcss @tailwindcss/cli',
      );

      consoleErrorSpy.mockRestore();
    });

    it('should fallback to console when logger fails on close event', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make logger.error throw an error
      vi.mocked(mockLogger.error).mockImplementation(() => {
        throw new Error('Logger failed');
      });

      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      mockProcess.emit('close', 1);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Tailwind CSS watcher exited with code 1');

      consoleErrorSpy.mockRestore();
    });

    it('should handle messages with "rebuilding" keyword not as error', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: false,
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      // Message with "error" but also "rebuilding" should not be treated as error
      mockProcess.stderr.emit('data', Buffer.from('Error detected, rebuilding...\n'));

      // Should not log as error
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle messages with "done in" keyword not as error', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: false,
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      // Message with "failed" but also "done in" should not be treated as error
      mockProcess.stderr.emit('data', Buffer.from('Build failed detection done in 50ms\n'));

      // Should not log as error (done in messages are not errors)
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle various error keywords', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      // Test different error keywords
      mockProcess.stderr.emit('data', Buffer.from('Cannot find module\n'));
      mockProcess.stderr.emit('data', Buffer.from('Unexpected token\n'));
      mockProcess.stderr.emit('data', Buffer.from('Syntax error in file\n'));

      expect(mockLogger.error).toHaveBeenCalledWith('Cannot find module');
      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected token');
      expect(mockLogger.error).toHaveBeenCalledWith('Syntax error in file');

      // Cleanup
      mockProcess.emit('close', 0);
    });
  });
});
