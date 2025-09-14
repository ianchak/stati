import fse from 'fs-extra';
import type { WriteFileOptions } from 'fs';
const {
  readFile: fseReadFile,
  writeFile: fseWriteFile,
  pathExists: fsePathExists,
  ensureDir: fseEnsureDir,
  remove: fseRemove,
  stat: fseStat,
  readdir: fseReaddir,
  copyFile: fseCopyFile,
} = fse;

/**
 * Type for Node.js errno exceptions
 */
interface NodeError extends Error {
  code?: string;
}

/**
 * Safely reads a file with consistent error handling.
 */
export async function readFile(
  filePath: string,
  encoding: 'utf-8' | 'utf8' = 'utf-8',
): Promise<string | null> {
  try {
    return await fseReadFile(filePath, encoding);
  } catch (error) {
    const nodeError = error as NodeError;
    if (nodeError.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw new Error(`Failed to read file ${filePath}: ${nodeError.message}`);
  }
}

/**
 * Safely writes content to a file with consistent error handling.
 */
export async function writeFile(
  filePath: string,
  content: string,
  options?: WriteFileOptions,
): Promise<void> {
  try {
    await fseWriteFile(filePath, content, options);
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to write file ${filePath}: ${nodeError.message}`);
  }
}

/**
 * Checks if a path exists with consistent error handling.
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    return await fsePathExists(filePath);
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to check path ${filePath}: ${nodeError.message}`);
  }
}

/**
 * Ensures a directory exists with consistent error handling.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fseEnsureDir(dirPath);
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to create directory ${dirPath}: ${nodeError.message}`);
  }
}

/**
 * Removes a file or directory with consistent error handling.
 */
export async function remove(path: string): Promise<void> {
  try {
    await fseRemove(path);
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to remove ${path}: ${nodeError.message}`);
  }
}

/**
 * Gets file stats with consistent error handling.
 */
export async function stat(filePath: string): Promise<fse.Stats> {
  try {
    return await fseStat(filePath);
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to get stats for ${filePath}: ${nodeError.message}`);
  }
}

/**
 * Reads directory contents with consistent error handling.
 */
export async function readdir<T extends boolean = false>(
  dirPath: string,
  options?: { withFileTypes?: T },
): Promise<T extends true ? fse.Dirent[] : string[]> {
  try {
    if (options?.withFileTypes) {
      return (await fseReaddir(dirPath, { withFileTypes: true })) as T extends true
        ? fse.Dirent[]
        : string[];
    }
    return (await fseReaddir(dirPath)) as T extends true ? fse.Dirent[] : string[];
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to read directory ${dirPath}: ${nodeError.message}`);
  }
}

/**
 * Copies a file with consistent error handling.
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  try {
    await fseCopyFile(src, dest);
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to copy ${src} to ${dest}: ${nodeError.message}`);
  }
}
