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
  });
});
