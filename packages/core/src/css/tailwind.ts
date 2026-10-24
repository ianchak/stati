/**
 * Runs the Tailwind CSS CLI once, for production builds. `stati dev` runs Tailwind's own
 * watcher from the CLI package instead.
 * @module css/tailwind
 */

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { readFile } from '../core/utils/fs.utils.js';

/**
 * Packages that ship the `tailwindcss` executable, nearest first in each folder:
 * Tailwind CSS 4 ships it in @tailwindcss/cli, Tailwind CSS 3 in tailwindcss itself.
 */
const CLI_PACKAGES: readonly string[][] = [['@tailwindcss', 'cli'], ['tailwindcss']];

const INSTALL_HINT =
  'Tailwind CSS is not installed. Install it with:\n  npm install -D tailwindcss @tailwindcss/cli';

/** Options for {@link runTailwindCLI}. */
export interface RunTailwindOptions {
  /** The project root, where the CLI is looked up and runs */
  projectRoot: string;
  /** The input stylesheet */
  input: string;
  /** The file Tailwind writes */
  output: string;
  /** Pass `--minify` */
  minify: boolean;
}

/**
 * The script a package's `tailwindcss` bin entry points at, or null when the package is
 * missing or has none (Tailwind CSS 4's tailwindcss package ships no CLI).
 */
async function readCliScript(packageDir: string): Promise<string | null> {
  const manifest = await readFile(join(packageDir, 'package.json'));
  if (manifest === null) {
    return null;
  }
  try {
    const { bin } = JSON.parse(manifest) as { bin?: string | Record<string, string> };
    const script = typeof bin === 'string' ? bin : bin?.tailwindcss;
    return script ? join(packageDir, script) : null;
  } catch {
    return null;
  }
}

/**
 * Finds the Tailwind CSS CLI script installed for a project, looking in its node_modules and
 * those of the folders above it, as Node.js resolves packages.
 *
 * @param projectRoot - The project root
 * @returns The CLI's script, which Node.js runs, or null when Tailwind CSS is not installed
 */
export async function findTailwindCli(projectRoot: string): Promise<string | null> {
  let dir = resolve(projectRoot);
  for (;;) {
    for (const segments of CLI_PACKAGES) {
      const script = await readCliScript(join(dir, 'node_modules', ...segments));
      if (script) {
        return script;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Tailwind's output without colors, its version banner and its timing line, which leaves the
 * error. Tailwind CSS 4 frames an error between an `Error:` line and box-drawing characters.
 */
function describeTailwindOutput(output: string): string {
  return (
    output
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, '')
      .split(/\r?\n/)
      .filter((line) => !/^\s*(≈ tailwindcss\b|done in\b|error:$|[┌└]\s*$)/i.test(line.trim()))
      .map((line) => line.replace(/^(\s*)│ ?/, '$1'))
      .join('\n')
      .trim()
  );
}

/**
 * Runs the Tailwind CSS CLI (version 3 or 4) once and waits for it to write the output.
 * Node.js runs the CLI's script directly, without a shell, so paths with spaces work on
 * every platform.
 *
 * @param options - The project, input and output files, and whether to minify
 * @throws {Error} When Tailwind CSS is not installed, or exits with an error
 */
export async function runTailwindCLI(options: RunTailwindOptions): Promise<void> {
  const { projectRoot, input, output, minify } = options;
  const cli = await findTailwindCli(projectRoot);
  if (!cli) {
    throw new Error(INSTALL_HINT);
  }

  const args = [cli, '-i', input, '-o', output, ...(minify ? ['--minify'] : [])];
  await new Promise<void>((resolvePromise, reject) => {
    const proc = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let log = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      log += chunk.toString();
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      log += chunk.toString();
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to start Tailwind CSS: ${error.message}`, { cause: error }));
    });
    proc.on('close', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      const reason = code !== null ? `exited with code ${code}` : `was stopped by ${signal}`;
      const message = describeTailwindOutput(log);
      reject(new Error(`Tailwind CSS ${reason}${message ? `:\n${message}` : ''}`));
    });
  });
}
