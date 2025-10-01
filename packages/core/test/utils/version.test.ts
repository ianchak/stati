import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Define error interface for mocking
interface MockError extends Error {
  code?: string;
}

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

// Mock path module methods we use
vi.mock('path', () => ({
  join: vi.fn(),
  dirname: vi.fn(),
}));

// Mock url module
vi.mock('url', () => ({
  fileURLToPath: vi.fn(),
}));

describe('getStatiVersion', () => {
  const mockReadFileSync = vi.mocked(readFileSync);
  const mockJoin = vi.mocked(join);
  const mockDirname = vi.mocked(dirname);
  const mockFileURLToPath = vi.mocked(fileURLToPath);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks for path resolution
    mockFileURLToPath.mockReturnValue('/mock/path/to/packages/core/dist/core/utils/version.js');
    mockDirname.mockReturnValue('/mock/path/to/packages/core/dist/core/utils');
    mockJoin.mockReturnValue('/mock/path/to/packages/core/package.json');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the version from package.json when file exists and is valid', async () => {
    // Arrange
    const mockPackageJson = {
      name: '@stati/core',
      version: '1.6.0',
      description: 'Stati core package',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.6.0');
    expect(mockFileURLToPath).toHaveBeenCalledWith(expect.stringContaining('version.ts'));
    expect(mockDirname).toHaveBeenCalledWith(
      '/mock/path/to/packages/core/dist/core/utils/version.js',
    );
    expect(mockJoin).toHaveBeenCalledWith(
      '/mock/path/to/packages/core/dist/core/utils',
      '../../../package.json',
    );
    expect(mockReadFileSync).toHaveBeenCalledWith(
      '/mock/path/to/packages/core/package.json',
      'utf-8',
    );
  });

  it('should return fallback version when package.json file does not exist', async () => {
    // Arrange
    mockReadFileSync.mockImplementation(() => {
      const error = new Error('ENOENT: no such file or directory') as MockError;
      error.code = 'ENOENT';
      throw error;
    });

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
    expect(mockReadFileSync).toHaveBeenCalledWith(
      '/mock/path/to/packages/core/package.json',
      'utf-8',
    );
  });

  it('should return fallback version when package.json contains invalid JSON', async () => {
    // Arrange
    mockReadFileSync.mockReturnValue('{ invalid json content');

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
    expect(mockReadFileSync).toHaveBeenCalledWith(
      '/mock/path/to/packages/core/package.json',
      'utf-8',
    );
  });

  it('should return fallback version when package.json does not have version field', async () => {
    // Arrange
    const mockPackageJson = {
      name: '@stati/core',
      description: 'Stati core package',
      // Missing version field
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
  });

  it('should return fallback version when package.json version field is empty', async () => {
    // Arrange
    const mockPackageJson = {
      name: '@stati/core',
      version: '', // Empty version
      description: 'Stati core package',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
  });

  it('should return fallback version when package.json version field is whitespace only', async () => {
    // Arrange
    const mockPackageJson = {
      name: '@stati/core',
      version: '   ', // Whitespace only version
      description: 'Stati core package',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
  });

  it('should return fallback version when package.json version field is not a string', async () => {
    // Arrange
    const mockPackageJson = {
      name: '@stati/core',
      version: 123, // Number instead of string
      description: 'Stati core package',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
  });

  it('should handle different version formats correctly', async () => {
    // Test cases for different version formats
    const testCases = [
      { input: '2.0.0', expected: '2.0.0' },
      { input: '1.0.0-beta.1', expected: '1.0.0-beta.1' },
      { input: '3.2.1-alpha.2+build.123', expected: '3.2.1-alpha.2+build.123' },
      { input: '0.1.0', expected: '0.1.0' },
    ];

    for (const testCase of testCases) {
      // Arrange
      const mockPackageJson = {
        name: '@stati/core',
        version: testCase.input,
        description: 'Stati core package',
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      // Act
      const { getStatiVersion } = await import('../../src/core/utils/version.js');
      const version = getStatiVersion();

      // Assert
      expect(version).toBe(testCase.expected);
    }
  });

  it('should use the correct path resolution for compiled code', async () => {
    // Arrange - Simulate the compiled context
    const compiledPath = '/project/packages/core/dist/core/utils/version.js';
    const compiledDir = '/project/packages/core/dist/core/utils';
    const expectedPackagePath = '/project/packages/core/package.json';

    mockFileURLToPath.mockReturnValue(compiledPath);
    mockDirname.mockReturnValue(compiledDir);
    mockJoin.mockReturnValue(expectedPackagePath);

    const mockPackageJson = {
      name: '@stati/core',
      version: '2.1.0',
      description: 'Stati core package',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('2.1.0');
    expect(mockJoin).toHaveBeenCalledWith(compiledDir, '../../../package.json');
    expect(mockReadFileSync).toHaveBeenCalledWith(expectedPackagePath, 'utf-8');
  });

  it('should handle permission errors gracefully', async () => {
    // Arrange
    mockReadFileSync.mockImplementation(() => {
      const error = new Error('EACCES: permission denied') as MockError;
      error.code = 'EACCES';
      throw error;
    });

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
  });

  it('should handle unexpected file content types gracefully', async () => {
    // Arrange
    mockReadFileSync.mockReturnValue(Buffer.from('binary content') as unknown as string);

    // Act
    const { getStatiVersion } = await import('../../src/core/utils/version.js');
    const version = getStatiVersion();

    // Assert
    expect(version).toBe('1.0.0');
  });
});
