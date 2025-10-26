/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs-extra before importing
vi.mock('fs-extra', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    pathExists: vi.fn(),
    ensureDir: vi.fn(),
    remove: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    copyFile: vi.fn(),
  },
}));

import fse from 'fs-extra';
import type { WriteFileOptions, Stats, Dirent } from 'fs';
import {
  readFile,
  writeFile,
  pathExists,
  ensureDir,
  remove,
  stat,
  readdir,
  copyFile,
} from '../../src/core/utils/fs.utils.js';

// Get the mocked functions from the default export
const mockReadFile = fse.readFile as any;
const mockWriteFile = fse.writeFile as any;
const mockPathExists = fse.pathExists as any;
const mockEnsureDir = fse.ensureDir as any;
const mockRemove = fse.remove as any;
const mockStat = fse.stat as any;
const mockReaddir = fse.readdir as any;
const mockCopyFile = fse.copyFile as any;

// Interface for Node.js errno exceptions
interface NodeError extends Error {
  code?: string;
}

describe('File System Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/file.txt';

      mockReadFile.mockResolvedValue(testContent);

      const result = await readFile(testPath);

      expect(mockReadFile).toHaveBeenCalledWith(testPath, 'utf-8');
      expect(result).toBe(testContent);
    });

    it('should read file with custom encoding', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/file.txt';

      mockReadFile.mockResolvedValue(testContent);

      const result = await readFile(testPath, 'utf8');

      expect(mockReadFile).toHaveBeenCalledWith(testPath, 'utf8');
      expect(result).toBe(testContent);
    });

    it('should return null when file does not exist (ENOENT)', async () => {
      const testPath = '/test/nonexistent.txt';
      const error: NodeError = new Error('File not found');
      error.code = 'ENOENT';

      mockReadFile.mockRejectedValue(error);

      const result = await readFile(testPath);

      expect(mockReadFile).toHaveBeenCalledWith(testPath, 'utf-8');
      expect(result).toBeNull();
    });

    it('should throw error for non-ENOENT errors', async () => {
      const testPath = '/test/file.txt';
      const error: NodeError = new Error('Permission denied');
      error.code = 'EACCES';

      mockReadFile.mockRejectedValue(error);

      await expect(readFile(testPath)).rejects.toThrow(
        'Failed to read file /test/file.txt: Permission denied',
      );
      expect(mockReadFile).toHaveBeenCalledWith(testPath, 'utf-8');
    });

    it('should throw error for generic errors', async () => {
      const testPath = '/test/file.txt';
      const error = new Error('Some other error');

      mockReadFile.mockRejectedValue(error);

      await expect(readFile(testPath)).rejects.toThrow(
        'Failed to read file /test/file.txt: Some other error',
      );
    });
  });

  describe('writeFile', () => {
    it('should write content to file successfully', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/file.txt';

      mockWriteFile.mockResolvedValue(undefined);

      await expect(writeFile(testPath, testContent)).resolves.toBeUndefined();

      expect(mockWriteFile).toHaveBeenCalledWith(testPath, testContent, undefined);
    });

    it('should write content with options', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/file.txt';
      const options: WriteFileOptions = { encoding: 'utf8', mode: 0o644 };

      mockWriteFile.mockResolvedValue(undefined);

      await expect(writeFile(testPath, testContent, options)).resolves.toBeUndefined();

      expect(mockWriteFile).toHaveBeenCalledWith(testPath, testContent, options);
    });

    it('should throw error on write failure', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/file.txt';
      const error: NodeError = new Error('Disk full');
      error.code = 'ENOSPC';

      mockWriteFile.mockRejectedValue(error);

      await expect(writeFile(testPath, testContent)).rejects.toThrow(
        'Failed to write file /test/file.txt: Disk full',
      );
    });
  });

  describe('pathExists', () => {
    it('should return true when path exists', async () => {
      const testPath = '/test/existing.txt';

      mockPathExists.mockResolvedValue(true);

      const result = await pathExists(testPath);

      expect(mockPathExists).toHaveBeenCalledWith(testPath);
      expect(result).toBe(true);
    });

    it('should return false when path does not exist', async () => {
      const testPath = '/test/nonexistent.txt';

      mockPathExists.mockResolvedValue(false);

      const result = await pathExists(testPath);

      expect(mockPathExists).toHaveBeenCalledWith(testPath);
      expect(result).toBe(false);
    });

    it('should throw error on path check failure', async () => {
      const testPath = '/test/file.txt';
      const error: NodeError = new Error('Permission denied');
      error.code = 'EACCES';

      mockPathExists.mockRejectedValue(error);

      await expect(pathExists(testPath)).rejects.toThrow(
        'Failed to check path /test/file.txt: Permission denied',
      );
    });
  });

  describe('ensureDir', () => {
    it('should create directory successfully', async () => {
      const testPath = '/test/newdir';

      mockEnsureDir.mockResolvedValue(undefined);

      await expect(ensureDir(testPath)).resolves.toBeUndefined();

      expect(mockEnsureDir).toHaveBeenCalledWith(testPath);
    });

    it('should throw error on directory creation failure', async () => {
      const testPath = '/test/newdir';
      const error: NodeError = new Error('Permission denied');
      error.code = 'EACCES';

      mockEnsureDir.mockRejectedValue(error);

      await expect(ensureDir(testPath)).rejects.toThrow(
        'Failed to create directory /test/newdir: Permission denied',
      );
    });
  });

  describe('remove', () => {
    it('should remove file successfully', async () => {
      const testPath = '/test/file.txt';

      mockRemove.mockResolvedValue(undefined);

      await expect(remove(testPath)).resolves.toBeUndefined();

      expect(mockRemove).toHaveBeenCalledWith(testPath);
    });

    it('should remove directory successfully', async () => {
      const testPath = '/test/directory';

      mockRemove.mockResolvedValue(undefined);

      await expect(remove(testPath)).resolves.toBeUndefined();

      expect(mockRemove).toHaveBeenCalledWith(testPath);
    });

    it('should throw error on removal failure', async () => {
      const testPath = '/test/file.txt';
      const error: NodeError = new Error('Permission denied');
      error.code = 'EACCES';

      mockRemove.mockRejectedValue(error);

      await expect(remove(testPath)).rejects.toThrow(
        'Failed to remove /test/file.txt: Permission denied',
      );
    });
  });

  describe('stat', () => {
    it('should get file stats successfully', async () => {
      const testPath = '/test/file.txt';
      const mockStats = {
        size: 1024,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      } as Stats;

      mockStat.mockResolvedValue(mockStats);

      const result = await stat(testPath);

      expect(mockStat).toHaveBeenCalledWith(testPath);
      expect(result).toBe(mockStats);
    });

    it('should throw error on stat failure', async () => {
      const testPath = '/test/file.txt';
      const error: NodeError = new Error('File not found');
      error.code = 'ENOENT';

      mockStat.mockRejectedValue(error);

      await expect(stat(testPath)).rejects.toThrow(
        'Failed to get stats for /test/file.txt: File not found',
      );
    });
  });

  describe('readdir', () => {
    it('should read directory contents successfully', async () => {
      const testPath = '/test/directory';
      const mockFiles = ['file1.txt', 'file2.txt', 'subdir'];

      mockReaddir.mockResolvedValue(mockFiles);

      const result = await readdir(testPath);

      expect(mockReaddir).toHaveBeenCalledWith(testPath);
      expect(result).toEqual(mockFiles);
    });

    it('should read directory with file types', async () => {
      const testPath = '/test/directory';
      const mockDirents = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true },
      ] as Dirent[];

      mockReaddir.mockResolvedValue(mockDirents);

      const result = await readdir(testPath, { withFileTypes: true });

      expect(mockReaddir).toHaveBeenCalledWith(testPath, { withFileTypes: true });
      expect(result).toEqual(mockDirents);
    });

    it('should throw error on directory read failure', async () => {
      const testPath = '/test/directory';
      const error: NodeError = new Error('Permission denied');
      error.code = 'EACCES';

      mockReaddir.mockRejectedValue(error);

      await expect(readdir(testPath)).rejects.toThrow(
        'Failed to read directory /test/directory: Permission denied',
      );
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const srcPath = '/test/source.txt';
      const destPath = '/test/destination.txt';

      mockCopyFile.mockResolvedValue(undefined);

      await expect(copyFile(srcPath, destPath)).resolves.toBeUndefined();

      expect(mockCopyFile).toHaveBeenCalledWith(srcPath, destPath);
    });

    it('should throw error on copy failure', async () => {
      const srcPath = '/test/source.txt';
      const destPath = '/test/destination.txt';
      const error: NodeError = new Error('Source file not found');
      error.code = 'ENOENT';

      mockCopyFile.mockRejectedValue(error);

      await expect(copyFile(srcPath, destPath)).rejects.toThrow(
        'Failed to copy /test/source.txt to /test/destination.txt: Source file not found',
      );
    });
  });
});
