import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadContent } from '../../src/core/content.js';
import type { StatiConfig } from '../../src/types/index.js';

// Create hoisted mocks that are available during module hoisting
const { mockReadFile, mockGlob } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGlob: vi.fn(),
}));

// Mock fs-extra and tinyglobby
vi.mock('fs-extra', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

vi.mock('tinyglobby', () => ({
  glob: mockGlob,
}));

describe('Flexible Structure Tests', () => {
  const mockConfig: StatiConfig = {
    srcDir: 'site',
    outDir: 'dist',
    staticDir: 'public',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('underscore folder exclusion', () => {
    it('should exclude folders starting with underscore from content discovery', async () => {
      // Arrange
      mockGlob.mockResolvedValue([
        '/project/site/index.md',
        '/project/site/about.md',
        '/project/site/blog/post.md',
      ]);

      mockReadFile.mockResolvedValue(`---
title: Test Page
---
# Test Content`);

      // Act
      await loadContent(mockConfig);

      // Assert
      expect(mockGlob).toHaveBeenCalledWith('**/*.md', {
        cwd: expect.stringContaining('site'),
        absolute: true,
        ignore: ['**/_*/**', '_*/**'],
        expandDirectories: false,
      });
    });

    it('should load content from regular folders but not underscore folders', async () => {
      // Arrange - simulate glob excluding _partials and _components
      mockGlob.mockResolvedValue([
        '/project/site/index.md',
        '/project/site/blog/post.md',
        // Note: _partials/test.md and blog/_components/meta.md are excluded by glob
      ]);

      mockReadFile.mockResolvedValue(`---
title: Test Page
---
# Test Content`);

      // Act
      const pages = await loadContent(mockConfig);

      // Assert: in path order
      expect(pages.map((page) => page.slug)).toEqual(['/blog/post', '/']);
    });
  });
});
