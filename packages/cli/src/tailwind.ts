import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { stripAnsi } from './colors.js';
import type { createLogger } from './logger.js';

export interface TailwindOptions {
  input: string;
  output: string;
  verbose?: boolean;
}

type Logger = ReturnType<typeof createLogger>;

/** Tailwind CSS 4 ships its CLI in @tailwindcss/cli; Tailwind CSS 3 includes it */
const INSTALL_COMMANDS =
  '  npm install -D tailwindcss @tailwindcss/cli\n' +
  '  or\n' +
  '  pnpm add -D tailwindcss @tailwindcss/cli';

/** Watchers that stopTailwindWatcher is stopping, so their exit is expected */
const stoppingWatchers = new WeakSet<ChildProcess>();

/** stati does not restart a watcher that has exited */
const RESTART_HINT = 'CSS changes are not rebuilt until stati dev restarts.';

/**
 * Check if tailwindcss (or Tailwind CSS 4's @tailwindcss/cli) is installed locally in node_modules
 */
function checkTailwindInstalled(): boolean {
  try {
    // Check if tailwindcss exists in node_modules
    // Start from current directory and traverse up to find node_modules
    let currentDir = process.cwd();
    const maxDepth = 10; // Prevent infinite loop

    for (let i = 0; i < maxDepth; i++) {
      const nodeModulesPath = join(currentDir, 'node_modules');
      if (
        existsSync(join(nodeModulesPath, 'tailwindcss')) ||
        existsSync(join(nodeModulesPath, '@tailwindcss', 'cli'))
      ) {
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
      error: 'Tailwind CSS is not installed. Install it with:\n' + INSTALL_COMMANDS,
    };
  }

  return { valid: true };
}

/**
 * Split a chunk of Tailwind's stderr into its message and its "Done in" lines.
 * Tailwind CSS 4 colors its output even when it is piped, frames an error between
 * an `Error:` line and ┌ │ └ box lines, and can write the error and the "Done in"
 * line after it in the same chunk. A pipe can also join Tailwind CSS 3's
 * "Rebuilding..." line to the error that follows it.
 */
function parseStderr(chunk: string): { message: string; timings: string[] } {
  const lines: string[] = [];
  const timings: string[] = [];

  for (const line of stripAnsi(chunk).split(/\r?\n/)) {
    const text = line.trim();
    if (/^done in\b/i.test(text)) {
      timings.push(text);
    } else if (!/^(rebuilding\.\.\.|error:|┌|└)$/i.test(text)) {
      lines.push(line.replace(/^(\s*)│ ?/, '$1'));
    }
  }

  return { message: lines.join('\n').trim(), timings };
}

/**
 * Watch and rebuild CSS using the Tailwind CSS CLI (Tailwind CSS 3 or 4)
 * In non-verbose mode, only errors are shown. Use --verbose to see all output.
 */
export function watchTailwindCSS(options: TailwindOptions, logger: Logger): ChildProcess {
  // Validate before running
  const validation = validateOptions(options, logger);
  if (!validation.valid) {
    logger.error(validation.error!);
    throw new Error(validation.error);
  }

  // Find the tailwindcss executable
  // Must use local node_modules/.bin/tailwindcss (works with npm/pnpm/yarn classic)
  let tailwindCmd: string;
  let args: string[];

  // Try to find local tailwindcss executable
  try {
    const localTailwindPath = join(process.cwd(), 'node_modules', '.bin', 'tailwindcss');
    const localTailwindCmdPath = localTailwindPath + '.cmd';

    if (existsSync(localTailwindCmdPath)) {
      // Use .cmd version on Windows
      tailwindCmd = localTailwindCmdPath;
      args = ['-i', options.input, '-o', options.output, '--watch'];
    } else if (existsSync(localTailwindPath)) {
      // Use direct executable (Unix-like systems)
      tailwindCmd = localTailwindPath;
      args = ['-i', options.input, '-o', options.output, '--watch'];
    } else {
      // Executable not found, throw error
      const errorMsg =
        'Tailwind CSS executable not found in node_modules/.bin/\n' +
        'Tailwind CSS 4 runs from the @tailwindcss/cli package. Install it locally:\n' +
        INSTALL_COMMANDS;
      logger.error(errorMsg);
      throw new Error('Tailwind CSS not found in node_modules');
    }
  } catch (err) {
    // If it's our thrown error, re-throw it
    if (err instanceof Error && err.message.includes('Tailwind CSS not found')) {
      throw err;
    }
    // For other errors during resolution, throw a descriptive error
    const errorMsg =
      'Failed to locate Tailwind CSS executable:\n' +
      '  Make sure Tailwind CSS is installed: npm install -D tailwindcss @tailwindcss/cli';
    logger.error(errorMsg);
    throw new Error('Failed to locate Tailwind CSS executable', { cause: err });
  }

  if (!options.verbose) {
    logger.info('Watching CSS with Tailwind CSS (non-verbose mode)...\n');
  } else {
    logger.info('Watching CSS with Tailwind CSS (verbose mode)...\n');
  }

  // Tailwind's watcher exits when its stdin closes, so it never outlives the process
  // that started it. Its stdin is a pipe that stays open while stati runs: an inherited
  // stdin is already closed when stati runs in a background or CI shell, which stopped
  // the watcher at once. However stati exits, the pipe closes and Tailwind stops too.
  const proc = spawn(tailwindCmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  // Nothing is written to stdin. Ending it after Tailwind has exited can fail with EPIPE.
  proc.stdin?.on('error', () => {});

  proc.stdout?.on('data', (data) => {
    try {
      const message = stripAnsi(data.toString()).trim();
      // Only show stdout in verbose mode
      if (options.verbose && message) {
        logger.info(message);
      }
    } catch (err) {
      // Fallback to console if logger fails
      console.error('Logger error processing stdout:', err);
    }
  });

  proc.stderr?.on('data', (data) => {
    try {
      const { message, timings } = parseStderr(data.toString());

      // Tailwind writes some info to stderr, we need to filter actual errors
      const lowerMessage = message.toLowerCase();

      const isError =
        (lowerMessage.includes('error') ||
          lowerMessage.includes('failed') ||
          lowerMessage.includes('cannot find') ||
          lowerMessage.includes('unexpected') ||
          lowerMessage.includes('syntax error')) &&
        !lowerMessage.includes('rebuilding') &&
        !lowerMessage.includes('done in') &&
        // Filter out shutdown messages
        !lowerMessage.includes('stopping') &&
        !lowerMessage.includes('shutting down');

      if (isError) {
        // Always show errors regardless of verbose mode
        logger.error(message);
      }

      if (options.verbose) {
        // Show completion messages only in verbose mode
        for (const timing of timings) {
          logger.info(timing.replace(/^Done in/i, 'Tailwind done in'));
        }
      }
      // Suppress all other Tailwind output to reduce chatter
    } catch (err) {
      // Fallback to console if logger fails
      console.error('Logger error processing stderr:', err);
      console.error('Original message:', data.toString());
    }
  });

  proc.on('error', (err) => {
    try {
      logger.error(`Failed to start Tailwind CSS: ${err.message}`);
      logger.error(
        'Make sure Tailwind CSS is installed: npm install -D tailwindcss @tailwindcss/cli',
      );
    } catch (_logErr) {
      // Fallback to console if logger fails
      console.error('Failed to start Tailwind CSS:', err.message);
      console.error(
        'Make sure Tailwind CSS is installed: npm install -D tailwindcss @tailwindcss/cli',
      );
    }
  });

  proc.on('close', (code) => {
    // stati is stopping the watcher itself
    if (stoppingWatchers.has(proc)) {
      return;
    }

    try {
      if (code !== 0 && code !== null) {
        // Tailwind CSS 4 exits, for example, when the CSS has an error at startup
        logger.error(`Tailwind CSS watcher exited with code ${code}. ${RESTART_HINT}`);
      } else if (code === 0) {
        // A watcher exits cleanly only when its stdin closes, which stati did not do
        logger.warning(`Tailwind CSS watcher stopped. ${RESTART_HINT}`);
      }
    } catch (_err) {
      // Fallback to console if logger fails
      console.error(`Tailwind CSS watcher exited with code ${code}`);
    }
  });

  return proc;
}

/**
 * Stop a watcher started by watchTailwindCSS and wait until it has exited.
 * Ending stdin is the stop signal Tailwind's watcher listens for. Unlike a process
 * signal it reaches Tailwind behind the shell that started it, which on Windows keeps
 * running when the shell is killed. SIGTERM stops the shell itself, and a watcher
 * still running after `timeoutMs` is killed.
 */
export function stopTailwindWatcher(
  proc: ChildProcess,
  logger: Logger,
  timeoutMs = 3000,
): Promise<void> {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return Promise.resolve();
  }

  stoppingWatchers.add(proc);

  return new Promise<void>((resolve) => {
    const timeout = global.setTimeout(() => {
      logger.warning('Tailwind watcher did not exit cleanly, forcing shutdown');
      proc.kill('SIGKILL');
      resolve();
    }, timeoutMs);

    proc.once('close', () => {
      global.clearTimeout(timeout);
      resolve();
    });

    proc.stdin?.end();
    proc.kill('SIGTERM');
  });
}
