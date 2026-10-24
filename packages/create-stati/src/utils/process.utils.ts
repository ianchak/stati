import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

export interface SpawnOptions {
  cwd?: string;
  stdio?: 'ignore' | 'inherit' | 'pipe';
  timeout?: number;
}

/** How long a timed-out process may take to exit after it is killed */
export const KILL_GRACE_PERIOD = 5000;

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
 * @returns Promise that resolves when process exits successfully
 * @throws Error if process fails or times out
 */
export async function spawnProcess(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<void> {
  const { cwd, stdio = 'ignore', timeout } = options;

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio,
      shell: process.platform === 'win32',
    });

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
        // Reject once the process has exited, so nothing it started is still writing
        // files, but don't hang if it never reports its exit
        graceHandle = global.setTimeout(() => reject(timeoutError()), KILL_GRACE_PERIOD);
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
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
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
