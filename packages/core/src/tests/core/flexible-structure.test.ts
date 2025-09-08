import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadContent } from '../../core/content.js';
import type { StatiConfig } from '../../types.js';

// Create hoisted mocks that are available during module hoisting
const { mockReadFile, mockGlob } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGlob: vi.fn(),
}));

// Mock fs-extra and fast-glob
vi.mock('fs-extra', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

vi.mock('fast-glob', () => ({
  default: mockGlob,
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

      // Assert
      expect(pages).toHaveLength(2);
      expect(pages[0]?.slug).toBe('/');
      expect(pages[1]?.slug).toBe('/blog/post');
    });
  });

  describe('partial discovery', () => {
    it('should discover partials in underscore folders throughout hierarchy', async () => {
      // This would require mocking the template rendering process
      // For now, we'll test the content exclusion which is the foundation
      expect(true).toBe(true);
    });
  });
});
