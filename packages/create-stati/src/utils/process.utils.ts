import { spawn } from 'node:child_process';

export interface SpawnOptions {
  cwd?: string;
  stdio?: 'ignore' | 'inherit' | 'pipe';
  timeout?: number;
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

    if (timeout) {
      timeoutHandle = global.setTimeout(() => {
        child.kill();
        reject(new Error(`Process timed out after ${timeout}ms`));
      }, timeout);
    }

    child.on('error', (error) => {
      if (timeoutHandle) global.clearTimeout(timeoutHandle);
      reject(error);
    });

    child.on('exit', (code) => {
      if (timeoutHandle) global.clearTimeout(timeoutHandle);
      if (code === 0) {
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
