import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildTailwindCSS, watchTailwindCSS } from '../src/tailwind.js';
import { createLogger } from '../src/logger.js';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { EventEmitter } from 'events';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');

describe('Tailwind CSS CLI Commands', () => {
  let mockLogger: ReturnType<typeof createLogger>;
  let mockProcess: EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: (signal: string) => void;
  };

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as ReturnType<typeof createLogger>;

    // Create mock process
    mockProcess = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      killed: false,
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

  describe('buildTailwindCSS', () => {
    it('should build CSS successfully with default options', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      // Simulate successful build
      globalThis.setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockLogger.info).toHaveBeenCalledWith('Building CSS with Tailwind CSS...');
      expect(mockLogger.success).toHaveBeenCalledWith('CSS built successfully');
      // Should use local executable (.cmd on Windows)
      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining('tailwindcss'),
        ['-i', 'src/styles.css', '-o', 'public/styles.css'],
        expect.objectContaining({ shell: true }),
      );
    });

    it('should build CSS with minify option', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          minify: true,
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      // Should use local executable (.cmd on Windows)
      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining('tailwindcss'),
        ['-i', 'src/styles.css', '-o', 'public/styles.css', '--minify'],
        expect.objectContaining({ shell: true }),
      );
    });

    it('should handle build errors', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Error: Failed to compile'));
        mockProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toThrow('Build failed with exit code 1');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed'));
    });

    it('should handle process spawn errors', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.emit('error', new Error('Command not found'));
      }, 10);

      await expect(promise).rejects.toThrow('Command not found');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to start'));
    });

    it('should validate input file exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(
        buildTailwindCSS(
          {
            input: 'nonexistent.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).rejects.toThrow('Input file not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Input file not found'),
      );
    });

    it('should show stdout messages during build', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Rebuilding...'));
        mockProcess.stdout.emit('data', Buffer.from('Done in 123ms'));
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockLogger.info).toHaveBeenCalledWith('Rebuilding...');
      expect(mockLogger.info).toHaveBeenCalledWith('Done in 123ms');
    });

    it('should differentiate between errors and info in stderr', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Rebuilding...'));
        mockProcess.stderr.emit('data', Buffer.from('Error: Syntax error'));
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockLogger.info).toHaveBeenCalledWith('Rebuilding...');
      expect(mockLogger.error).toHaveBeenCalledWith('Error: Syntax error');
    });
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

      expect(mockLogger.error).toHaveBeenCalledWith('Tailwind CSS watcher exited with code 1');
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
    });
  });

  describe('Tailwind installation check', () => {
    it('should check if tailwindcss is installed', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('tailwindcss')) {
          return false;
        }
        return true;
      });

      await expect(
        buildTailwindCSS(
          {
            input: 'src/styles.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).rejects.toThrow('Tailwind CSS is not installed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Tailwind CSS is not installed'),
      );
    });

    it('should handle errors when checking tailwind installation', async () => {
      // Mock existsSync to throw an error during traversal
      vi.mocked(existsSync).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('node_modules')) {
          throw new Error('File system error');
        }
        return true;
      });

      await expect(
        buildTailwindCSS(
          {
            input: 'src/styles.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).rejects.toThrow('Tailwind CSS is not installed');
    });

    it('should traverse up directory tree to find tailwindcss', async () => {
      const mockCalls: string[] = [];
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path);
        mockCalls.push(pathStr);

        // Simulate finding tailwindcss in parent directory
        if (pathStr.includes('node_modules') && pathStr.includes('tailwindcss')) {
          // Don't find it in first call, find it in second
          return mockCalls.filter((p) => p.includes('tailwindcss')).length > 1;
        }

        if (pathStr.includes('.bin') && pathStr.includes('tailwindcss')) {
          return pathStr.endsWith('.cmd');
        }

        return true;
      });

      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      // Should have checked multiple directories
      const tailwindChecks = mockCalls.filter(
        (p) => p.includes('node_modules') && p.includes('tailwindcss'),
      );
      expect(tailwindChecks.length).toBeGreaterThan(0);
    });
  });

  describe('Unix path handling', () => {
    it('should use Unix executable in buildTailwindCSS when .cmd not found', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path);

        // Simulate Unix environment - no .cmd file
        if (pathStr.includes('.bin') && pathStr.includes('tailwindcss')) {
          return !pathStr.endsWith('.cmd');
        }

        return true;
      });

      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        expect.stringMatching(/tailwindcss$/),
        ['-i', 'src/styles.css', '-o', 'public/styles.css'],
        expect.objectContaining({ shell: true }),
      );
    });

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

    it('should handle resolution errors in buildTailwindCSS', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = String(path);

        if (pathStr.includes('.bin') && pathStr.includes('tailwindcss')) {
          // Throw a different error (not our custom one)
          throw new Error('Permission denied');
        }

        return true;
      });

      await expect(
        buildTailwindCSS(
          {
            input: 'src/styles.css',
            output: 'public/styles.css',
          },
          mockLogger,
        ),
      ).rejects.toThrow('Failed to locate Tailwind CSS executable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to locate Tailwind CSS executable'),
      );
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
        'Make sure tailwindcss is installed: npm install -D tailwindcss',
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

  describe('buildTailwindCSS edge cases', () => {
    it('should handle empty stdout messages', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from(''));
        mockProcess.stdout.emit('data', Buffer.from('   \n'));
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      // Should not log empty messages
      const infoCalls = vi
        .mocked(mockLogger.info)
        .mock.calls.filter((call) => call[0] !== 'Building CSS with Tailwind CSS...');
      const emptyMessages = infoCalls.filter((call) => !call[0] || call[0].trim() === '');
      expect(emptyMessages.length).toBe(0);
    });

    it('should handle empty stderr messages', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from(''));
        mockProcess.stderr.emit('data', Buffer.from('   \n'));
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      // Should handle gracefully
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should detect various error keywords in stderr', async () => {
      const promise = buildTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Cannot find required file\n'));
        mockProcess.stderr.emit('data', Buffer.from('Unexpected end of input\n'));
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockLogger.error).toHaveBeenCalledWith('Cannot find required file');
      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected end of input');
    });
  });
});
