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
 * Wraps fs-extra operations with consistent error handling.
 */
async function wrapFsOperation<T>(operation: string, fsCall: Promise<T>, path: string): Promise<T> {
  try {
    return await fsCall;
  } catch (error) {
    const nodeError = error as NodeError;
    throw new Error(`Failed to ${operation} ${path}: ${nodeError.message}`);
  }
}

/**
 * Wraps fs-extra operations that should return null on ENOENT.
 */
async function wrapFsOperationNullable<T>(
  operation: string,
  fsCall: Promise<T>,
  path: string,
): Promise<T | null> {
  try {
    return await fsCall;
  } catch (error) {
    const nodeError = error as NodeError;
    if (nodeError.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw new Error(`Failed to ${operation} ${path}: ${nodeError.message}`);
  }
}

/**
 * Safely reads a file with consistent error handling.
 */
export async function readFile(
  filePath: string,
  encoding: 'utf-8' | 'utf8' = 'utf-8',
): Promise<string | null> {
  return wrapFsOperationNullable('read file', fseReadFile(filePath, encoding), filePath);
}

/**
 * Safely writes content to a file with consistent error handling.
 */
export async function writeFile(
  filePath: string,
  content: string,
  options?: WriteFileOptions,
): Promise<void> {
  return wrapFsOperation('write file', fseWriteFile(filePath, content, options), filePath);
}

/**
 * Checks if a path exists with consistent error handling.
 */
export async function pathExists(filePath: string): Promise<boolean> {
  return wrapFsOperation('check path', fsePathExists(filePath), filePath);
}

/**
 * Ensures a directory exists with consistent error handling.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  return wrapFsOperation('create directory', fseEnsureDir(dirPath), dirPath);
}

/**
 * Removes a file or directory with consistent error handling.
 */
export async function remove(path: string): Promise<void> {
  return wrapFsOperation('remove', fseRemove(path), path);
}

/**
 * Gets file stats with consistent error handling.
 */
export async function stat(filePath: string): Promise<fse.Stats> {
  return wrapFsOperation('get stats for', fseStat(filePath), filePath);
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
  return wrapFsOperation('copy', fseCopyFile(src, dest), `${src} to ${dest}`);
}
