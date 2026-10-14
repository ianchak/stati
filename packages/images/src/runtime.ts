/**
 * Loading sharp and Satori, limiting concurrent work, and writing files safely.
 * @module runtime
 */

import { availableParallelism } from 'node:os';
import { readFileSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { URL } from 'node:url';
import type Sharp from 'sharp';

/** The sharp module's default export. */
export type SharpModule = typeof Sharp;

/** Version of this package, read from its package.json. */
export const PACKAGE_VERSION: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as {
    version: string;
  }
).version;

/**
 * Loads sharp, explaining what to do when its native binary is missing for this platform.
 */
export async function loadSharp(): Promise<SharpModule> {
  try {
    const module = await import('sharp');
    const sharp = module.default;
    // The dev server is long-lived; libvips' operation cache only grows memory there
    sharp.cache(false);
    return sharp;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not load sharp for ${process.platform}-${process.arch}: ${reason}\n` +
        'Reinstall dependencies on this machine. If your lockfile was created on another ' +
        'operating system, make sure it includes the optional @img/sharp-* packages for this one. ' +
        'See https://sharp.pixelplumbing.com/install',
      { cause: error },
    );
  }
}

/**
 * Default number of encodes that run at once.
 * sharp runs on libuv's thread pool (4 threads unless UV_THREADPOOL_SIZE is set), which file
 * system calls share, so at most three encodes run at once and the build's I/O keeps a thread.
 */
export function defaultConcurrency(): number {
  const poolSize = Number(process.env.UV_THREADPOOL_SIZE) || 4;
  return Math.max(1, Math.min(Math.floor(availableParallelism() / 2), poolSize - 1));
}

/**
 * Runs at most `concurrency` tasks at once, in the order they were queued.
 */
export function createLimiter(concurrency: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const start = queue.shift();
    if (start) {
      active++;
      start();
    }
  };

  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
}

/**
 * Writes a file through a temporary path and renames it into place, so an interrupted
 * build never leaves a truncated image at a URL pages already point to.
 *
 * @param filePath - Final path
 * @param write - Writes the file at the given temporary path
 */
export async function writeAtomically(
  filePath: string,
  write: (tempPath: string) => Promise<unknown>,
): Promise<void> {
  const tempPath = `${filePath}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await write(tempPath);
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}
