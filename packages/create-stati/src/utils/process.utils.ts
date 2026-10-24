import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

export interface SpawnOptions {
  cwd?: string;
  stdio?: 'ignore' | 'inherit' | 'pipe';
  timeout?: number;
  /**
   * How long a timed-out process may take to exit after it is stopped. The call rejects
   * when it exits, or when the grace period runs out, after force-killing it. Without
   * it, the call rejects as soon as the process is stopped.
   */
  killGracePeriod?: number;
}

/**
 * A process that exited with a non-zero code. `stdout` holds what it printed when it
 * was spawned with `stdio: 'pipe'`.
 */
export class ProcessExitError extends Error {
  constructor(
    command: string,
    readonly code: number | null,
    readonly stdout: string,
  ) {
    super(`${command} exited with code ${code}`);
    this.name = 'ProcessExitError';
  }
}

/**
 * Stop a child process and the processes it started. On Windows the child is the
 * shell (`shell: true`), and killing only the shell would leave the command it runs,
 * such as npx, running. Elsewhere the signal reaches the command itself, and npm
 * forwards it to the processes it starts.
 */
function killProcessTree(child: ChildProcess): void {
  if (process.platform === 'win32' && child.pid !== undefined) {
    const taskkill = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    taskkill.on('error', () => child.kill());
    taskkill.on('exit', (code) => {
      if (code !== 0) child.kill();
    });
    return;
  }
  child.kill();
}

/**
 * Spawn a child process and wait for it to complete.
 * Automatically handles platform-specific shell requirements.
 *
 * @param command - The command to execute
 * @param args - Array of arguments to pass to the command
 * @param options - Spawn options
 * @returns Promise that resolves with what the process printed to stdout when `stdio` is
 *   `'pipe'`, and with an empty string otherwise
 * @throws ProcessExitError if the process exits with a non-zero code
 * @throws Error if the process fails to start or times out
 */
export async function spawnProcess(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<string> {
  const { cwd, stdio = 'ignore', timeout, killGracePeriod } = options;

  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    if (stdio === 'pipe') {
      // Nothing is written to the process, and stderr is drained so it can't fill up and block it
      child.stdin?.end();
      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => (stdout += chunk));
      child.stderr?.resume();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let timeoutHandle: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let graceHandle: any;
    let timedOut = false;
    const timeoutError = () => new Error(`Process timed out after ${timeout}ms`);
    const clearTimers = () => {
      if (timeoutHandle) global.clearTimeout(timeoutHandle);
      if (graceHandle) global.clearTimeout(graceHandle);
    };

    if (timeout) {
      timeoutHandle = global.setTimeout(() => {
        timedOut = true;
        killProcessTree(child);
        if (!killGracePeriod) {
          reject(timeoutError());
          return;
        }
        // Reject once the process has exited, so nothing it started is still writing
        // files. If it ignores the kill, force it, so it can't keep writing after we go on
        graceHandle = global.setTimeout(() => {
          child.kill('SIGKILL');
          reject(timeoutError());
        }, killGracePeriod);
      }, timeout);
    }

    child.on('error', (error) => {
      clearTimers();
      reject(error);
    });

    child.on('exit', (code) => {
      clearTimers();
      if (timedOut) {
        reject(timeoutError());
      } else if (code === 0) {
        resolve(stdout);
      } else {
        reject(new ProcessExitError(command, code, stdout));
      }
    });
  });
}

/**
 * Check if a command is available on the system by running it with --version.
 * Useful for detecting installed package managers or other tools.
 *
 * @param command - The command to check (e.g., 'npm', 'yarn', 'git')
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves to true if command is available, false otherwise
 */
export async function isCommandAvailable(
  command: string,
  timeout: number = 5000,
): Promise<boolean> {
  try {
    await spawnProcess(command, ['--version'], { stdio: 'ignore', timeout });
    return true;
  } catch {
    return false;
  }
}
