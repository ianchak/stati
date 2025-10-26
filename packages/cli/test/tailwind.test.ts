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
    vi.mocked(existsSync).mockReturnValue(true);
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
      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['tailwindcss', '-i', 'src/styles.css', '-o', 'public/styles.css'],
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

      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['tailwindcss', '-i', 'src/styles.css', '-o', 'public/styles.css', '--minify'],
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
      ).catch(() => {}); // Ignore rejection

      // Wait for watcher to start
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Watching CSS with Tailwind CSS'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('errors only'));
      expect(spawn).toHaveBeenCalledWith(
        'npx',
        ['tailwindcss', '-i', 'src/styles.css', '-o', 'public/styles.css', '--watch'],
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
      ).catch(() => {}); // Ignore rejection

      // Wait for watcher to start
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));

      expect(mockLogger.info).toHaveBeenCalledWith('Watching CSS with Tailwind CSS...');
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
      ).catch(() => {}); // Ignore rejection

      // Wait for watcher to start then emit messages
      await new Promise((resolve) => globalThis.setTimeout(resolve, 10));
      mockProcess.stderr.emit('data', Buffer.from('Rebuilding...'));
      mockProcess.stderr.emit('data', Buffer.from('Done in 50ms'));

      // Wait a bit more for processing
      await new Promise((resolve) => globalThis.setTimeout(resolve, 10));

      // Info messages should not be logged in non-verbose mode
      const infoCalls = vi.mocked(mockLogger.info).mock.calls;
      expect(infoCalls.some((call) => call[0]?.includes('Rebuilding'))).toBe(false);
      expect(infoCalls.some((call) => call[0]?.includes('Done in'))).toBe(false);

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
      ).catch(() => {}); // Ignore rejection

      // Wait for watcher to start then emit messages
      await new Promise((resolve) => globalThis.setTimeout(resolve, 10));
      mockProcess.stdout.emit('data', Buffer.from('Watching for changes...'));
      mockProcess.stderr.emit('data', Buffer.from('Rebuilding...'));

      // Wait a bit more for processing
      await new Promise((resolve) => globalThis.setTimeout(resolve, 10));

      expect(mockLogger.info).toHaveBeenCalledWith('Watching for changes...');
      expect(mockLogger.info).toHaveBeenCalledWith('Rebuilding...');

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should always show errors regardless of verbose mode', async () => {
      watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
          verbose: false,
        },
        mockLogger,
      ).catch(() => {}); // Ignore rejection

      // Wait for watcher to start then emit error
      await new Promise((resolve) => globalThis.setTimeout(resolve, 10));
      mockProcess.stderr.emit('data', Buffer.from('Error: Failed to compile'));

      // Wait a bit more for processing
      await new Promise((resolve) => globalThis.setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith('Error: Failed to compile');

      // Cleanup
      mockProcess.emit('close', 0);
    });

    it('should handle watcher errors', async () => {
      const promise = watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.emit('error', new Error('Watcher failed'));
      }, 10);

      await expect(promise).rejects.toThrow('Watcher failed');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to start'));
    });

    it('should handle non-zero exit codes', async () => {
      const promise = watchTailwindCSS(
        {
          input: 'src/styles.css',
          output: 'public/styles.css',
        },
        mockLogger,
      );

      globalThis.setTimeout(() => {
        mockProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toThrow('Watcher exited with code 1');
      expect(mockLogger.error).toHaveBeenCalledWith('Tailwind CSS watcher exited with code 1');
    });

    it('should validate input file exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(
        watchTailwindCSS(
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
