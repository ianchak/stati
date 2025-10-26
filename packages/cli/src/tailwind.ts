import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import type { createLogger } from './logger.js';

export interface TailwindOptions {
  input: string;
  output: string;
  minify?: boolean;
  verbose?: boolean;
}

type Logger = ReturnType<typeof createLogger>;

/**
 * Check if tailwindcss is installed locally in node_modules
 */
function checkTailwindInstalled(): boolean {
  try {
    // Check if tailwindcss exists in node_modules
    // Start from current directory and traverse up to find node_modules
    let currentDir = process.cwd();
    const maxDepth = 10; // Prevent infinite loop

    for (let i = 0; i < maxDepth; i++) {
      const tailwindPath = join(currentDir, 'node_modules', 'tailwindcss');
      if (existsSync(tailwindPath)) {
        return true;
      }

      const parentDir = resolve(currentDir, '..');
      if (parentDir === currentDir) {
        // Reached root
        break;
      }
      currentDir = parentDir;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validate options before running tailwind commands
 */
function validateOptions(
  options: TailwindOptions,
  _logger: Logger,
): { valid: boolean; error?: string } {
  // Check if input file exists
  const inputPath = resolve(options.input);
  if (!existsSync(inputPath)) {
    return {
      valid: false,
      error: `Input file not found: ${options.input}`,
    };
  }

  // Check if tailwindcss is installed
  const tailwindInstalled = checkTailwindInstalled();
  if (!tailwindInstalled) {
    return {
      valid: false,
      error:
        'Tailwind CSS is not installed. Install it with:\n  npm install -D tailwindcss\n  or\n  pnpm add -D tailwindcss',
    };
  }

  return { valid: true };
}

/**
 * Build CSS using Tailwind CSS CLI
 */
export async function buildTailwindCSS(options: TailwindOptions, logger: Logger): Promise<void> {
  // Validate before running
  const validation = validateOptions(options, logger);
  if (!validation.valid) {
    logger.error(validation.error!);
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const args = ['tailwindcss', '-i', options.input, '-o', options.output];

    if (options.minify) {
      args.push('--minify');
    }

    logger.info('Building CSS with Tailwind CSS...');

    const proc = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    proc.stdout?.on('data', (data) => {
      const message = data.toString();
      // Show build progress
      if (message.trim()) {
        logger.info(message.trim());
      }
    });

    proc.stderr?.on('data', (data) => {
      const message = data.toString();
      // Tailwind writes some info to stderr, filter actual errors
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes('error') ||
        lowerMessage.includes('failed') ||
        lowerMessage.includes('cannot find') ||
        lowerMessage.includes('unexpected')
      ) {
        // This looks like a real error
        if (message.trim()) {
          logger.error(message.trim());
        }
      } else {
        // Informational message from Tailwind (Rebuilding, Done, etc.)
        if (message.trim()) {
          logger.info(message.trim());
        }
      }
    });

    proc.on('error', (err) => {
      logger.error(`Failed to start Tailwind CSS: ${err.message}`);
      logger.error('Make sure tailwindcss is installed: npm install -D tailwindcss');
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        logger.success('CSS built successfully');
        resolve();
      } else {
        logger.error(`Tailwind CSS build failed with exit code ${code}`);
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });
  });
}

/**
 * Watch and rebuild CSS using Tailwind CSS CLI
 * In non-verbose mode, only errors are shown. Use --verbose to see all output.
 */
export async function watchTailwindCSS(options: TailwindOptions, logger: Logger): Promise<void> {
  // Validate before running
  const validation = validateOptions(options, logger);
  if (!validation.valid) {
    logger.error(validation.error!);
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const args = ['tailwindcss', '-i', options.input, '-o', options.output, '--watch'];

    if (!options.verbose) {
      logger.info('Watching CSS with Tailwind CSS (errors only, use --verbose for all output)...');
    } else {
      logger.info('Watching CSS with Tailwind CSS...');
    }

    const proc = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    proc.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      // Only show stdout in verbose mode
      if (options.verbose && message) {
        logger.info(message);
      }
    });

    proc.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      if (!message) return;

      // Tailwind writes some info to stderr, we need to filter actual errors
      const lowerMessage = message.toLowerCase();
      const isError =
        lowerMessage.includes('error') ||
        lowerMessage.includes('failed') ||
        lowerMessage.includes('cannot find') ||
        lowerMessage.includes('unexpected') ||
        lowerMessage.includes('syntax error');

      if (isError) {
        // Always show errors regardless of verbose mode
        logger.error(message);
      } else if (options.verbose) {
        // In verbose mode, show informational messages from stderr
        logger.info(message);
      }
      // In non-verbose mode, ignore non-error stderr messages (Rebuilding, Done, etc.)
    });

    proc.on('error', (err) => {
      logger.error(`Failed to start Tailwind CSS: ${err.message}`);
      logger.error('Make sure tailwindcss is installed: npm install -D tailwindcss');
      reject(err);
    });

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        logger.error(`Tailwind CSS watcher exited with code ${code}`);
        reject(new Error(`Watcher exited with code ${code}`));
      }
    });

    // Handle graceful shutdown
    const cleanup = () => {
      logger.info('Stopping Tailwind CSS watcher...');
      proc.kill('SIGTERM');
      // Force kill after 2 seconds if not terminated
      globalThis.setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 2000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
}
