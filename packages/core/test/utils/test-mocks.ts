import { vi } from 'vitest';

/**
 * Test mock utilities for Stati core tests.
 * Centralized mock factory functions to reduce duplication across test files.
 */

/**
 * Creates a complete set of hoisted mocks for build tests.
 * Use this inside vi.hoisted() calls.
 */
export function createBuildTestMocksObject() {
  return {
    // fs-extra mocks
    mockEnsureDir: vi.fn(),
    mockWriteFile: vi.fn(),
    mockCopy: vi.fn(),
    mockCopyFile: vi.fn(),
    mockRemove: vi.fn(),
    mockPathExists: vi.fn(),
    mockReaddir: vi.fn(),
    mockStat: vi.fn(),
    mockReadFile: vi.fn(),
    // core module mocks
    mockLoadConfig: vi.fn(),
    mockLoadContent: vi.fn(),
    mockCreateMarkdownProcessor: vi.fn(),
    mockRenderMarkdown: vi.fn(),
    mockCreateTemplateEngine: vi.fn(),
    mockRenderPage: vi.fn(),
    mockBuildNavigation: vi.fn(),
    // ISG mocks
    mockLoadCacheManifest: vi.fn(),
    mockSaveCacheManifest: vi.fn(),
    mockShouldRebuildPage: vi.fn(),
    mockCreateCacheEntry: vi.fn(),
    mockUpdateCacheEntry: vi.fn(),
    mockWithBuildLock: vi.fn(),
    // Hash mocks
    mockComputeContentHash: vi.fn(),
    mockComputeFileHash: vi.fn(),
    mockComputeInputsHash: vi.fn(),
    // Dependency tracking mocks
    mockTrackTemplateDependencies: vi.fn(),
    // TTL mocks
    mockComputeEffectiveTTL: vi.fn(),
    mockComputeNextRebuildAt: vi.fn(),
    mockIsPageFrozen: vi.fn(),
  };
}

/**
 * Creates fs-extra module mock implementation.
 */
export function mockFsExtraModule(mocks: ReturnType<typeof createBuildTestMocksObject>) {
  return {
    default: {
      ensureDir: mocks.mockEnsureDir,
      writeFile: mocks.mockWriteFile,
      copy: mocks.mockCopy,
      copyFile: mocks.mockCopyFile,
      remove: mocks.mockRemove,
      pathExists: mocks.mockPathExists,
      readdir: mocks.mockReaddir,
      stat: mocks.mockStat,
      readFile: mocks.mockReadFile,
    },
  };
}

/**
 * Sets up standard module mocks for build tests.
 * Call this after creating mocks with vi.hoisted().
 */
export function setupBuildModuleMocks(mocks: ReturnType<typeof createBuildTestMocksObject>) {
  vi.mock('fs-extra', () => mockFsExtraModule(mocks));

  vi.mock('../../src/config/loader.js', () => ({
    loadConfig: mocks.mockLoadConfig,
  }));

  vi.mock('../../src/core/content.js', () => ({
    loadContent: mocks.mockLoadContent,
  }));

  vi.mock('../../src/core/markdown.js', () => ({
    createMarkdownProcessor: mocks.mockCreateMarkdownProcessor,
    renderMarkdown: mocks.mockRenderMarkdown,
  }));

  vi.mock('../../src/core/templates.js', () => ({
    createTemplateEngine: mocks.mockCreateTemplateEngine,
    renderPage: mocks.mockRenderPage,
  }));

  vi.mock('../../src/core/navigation.js', () => ({
    buildNavigation: mocks.mockBuildNavigation,
  }));

  vi.mock('../../src/core/isg/manifest.js', () => ({
    loadCacheManifest: mocks.mockLoadCacheManifest,
    saveCacheManifest: mocks.mockSaveCacheManifest,
  }));

  vi.mock('../../src/core/isg/builder.js', () => ({
    shouldRebuildPage: mocks.mockShouldRebuildPage,
    createCacheEntry: mocks.mockCreateCacheEntry,
    updateCacheEntry: mocks.mockUpdateCacheEntry,
  }));

  vi.mock('../../src/core/isg/build-lock.js', () => ({
    withBuildLock: mocks.mockWithBuildLock,
  }));
}

/**
 * Sets up ISG-specific module mocks.
 */
export function setupISGModuleMocks(mocks: ReturnType<typeof createBuildTestMocksObject>) {
  vi.mock('../../src/core/isg/hash.js', () => ({
    computeContentHash: mocks.mockComputeContentHash,
    computeFileHash: mocks.mockComputeFileHash,
    computeInputsHash: mocks.mockComputeInputsHash,
  }));

  vi.mock('../../src/core/isg/deps.js', () => ({
    trackTemplateDependencies: mocks.mockTrackTemplateDependencies,
  }));

  vi.mock('../../src/core/isg/ttl.js', () => ({
    computeEffectiveTTL: mocks.mockComputeEffectiveTTL,
    computeNextRebuildAt: mocks.mockComputeNextRebuildAt,
    isPageFrozen: mocks.mockIsPageFrozen,
  }));
}

// Legacy exports for compatibility
export const createFsExtraMocks = createBuildTestMocksObject;
export const createCoreModuleMocks = createBuildTestMocksObject;
export const createISGMocks = createBuildTestMocksObject;
export const createBuildTestMocks = createBuildTestMocksObject;
