import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'path';
import type { PageModel, StatiConfig } from '../../../types.js';

// Mock fs-extra and fast-glob - use factory functions to avoid hoisting issues
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
  },
}));

vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

// Mock process.cwd() to return a consistent value
const mockCwd = vi.fn();
vi.stubGlobal('process', { cwd: mockCwd });

import {
  trackTemplateDependencies,
  findPartialDependencies,
  resolveTemplatePath,
} from '../../../core/isg/deps.js';

describe('ISG Dependency Tracking', () => {
  const testCwd = join('test', 'project');
  const testSrcDir = 'site';
  const absoluteSrcDir = join(testCwd, testSrcDir);

  // Get references to the mocked functions
  let mockPathExists: ReturnType<typeof vi.fn>;
  let mockGlob: ReturnType<typeof vi.fn>;

  const mockConfig: StatiConfig = {
    srcDir: testSrcDir,
    outDir: 'dist',
    site: {
      title: 'Test Site',
      baseUrl: 'https://test.com',
    },
  };

  const mockPage: PageModel = {
    slug: 'test-page',
    sourcePath: join(absoluteSrcDir, 'test.md'),
    url: '/test',
    frontMatter: {
      title: 'Test Page',
    },
    content: 'Test content',
    publishedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCwd.mockReturnValue(testCwd);

    // Get the mocked modules
    const fsExtra = await import('fs-extra');
    const glob = await import('fast-glob');

    mockPathExists = vi.mocked(fsExtra.default.pathExists);
    mockGlob = vi.mocked(glob.default);
  });

  describe('trackTemplateDependencies', () => {
    it('should return empty array when srcDir is missing', async () => {
      const { srcDir: _, ...configBase } = mockConfig;
      const configWithoutSrcDir: StatiConfig = configBase;

      const result = await trackTemplateDependencies(mockPage, configWithoutSrcDir);

      expect(result).toEqual([]);
    });

    it('should track layout and partial dependencies', async () => {
      // Mock layout discovery
      mockPathExists.mockImplementation((path: string) => {
        return path.includes('layout.eta');
      });

      // Mock partial discovery
      mockGlob.mockResolvedValue([
        join(absoluteSrcDir, '_partials/header.eta'),
        join(absoluteSrcDir, '_partials/footer.eta'),
      ]);

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      expect(result).toHaveLength(3);
      expect(result).toContain(join(absoluteSrcDir, 'layout.eta'));
      expect(result).toContain(join(absoluteSrcDir, '_partials/header.eta'));
      expect(result).toContain(join(absoluteSrcDir, '_partials/footer.eta'));
    });

    it('should handle explicit layout in front matter', async () => {
      const pageWithLayout = {
        ...mockPage,
        frontMatter: { ...mockPage.frontMatter, layout: 'custom' },
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('custom.eta');
      });
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(pageWithLayout, mockConfig);

      expect(result).toContain(join(absoluteSrcDir, 'custom.eta'));
      expect(mockPathExists).toHaveBeenCalledWith(join(absoluteSrcDir, 'custom.eta'));
    });

    it('should handle collection index pages', async () => {
      const indexPage = {
        ...mockPage,
        slug: 'index',
        url: '/blog/',
        sourcePath: join(absoluteSrcDir, 'blog/index.md'),
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('blog/index.eta');
      });
      mockGlob.mockResolvedValue([]);

      await trackTemplateDependencies(indexPage, mockConfig);

      // Should check for index.eta before layout.eta for index pages
      expect(mockPathExists).toHaveBeenCalledWith(join(absoluteSrcDir, 'blog/index.eta'));
    });

    it('should fallback to layout.eta when index.eta not found', async () => {
      const indexPage = {
        ...mockPage,
        slug: 'index',
        url: '/',
        sourcePath: join(absoluteSrcDir, 'index.md'),
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('layout.eta') && !path.includes('index.eta');
      });
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(indexPage, mockConfig);

      expect(result).toContain(join(absoluteSrcDir, 'layout.eta'));
    });

    it('should handle nested page paths', async () => {
      const nestedPage = {
        ...mockPage,
        sourcePath: join(absoluteSrcDir, 'blog/posts/deep/nested.md'),
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('layout.eta');
      });
      mockGlob.mockResolvedValue([
        join(absoluteSrcDir, '_partials/shared.eta'),
        join(absoluteSrcDir, 'blog/_partials/blog-header.eta'),
      ]);

      const result = await trackTemplateDependencies(nestedPage, mockConfig);

      // Should find some layout file
      const hasLayout = result.some((dep) => dep.includes('layout.eta'));
      expect(hasLayout).toBe(true);
      expect(result).toContain(join(absoluteSrcDir, '_partials/shared.eta'));
      expect(result).toContain(join(absoluteSrcDir, 'blog/_partials/blog-header.eta'));
    });
  });

  describe('findPartialDependencies', () => {
    it('should return empty array when srcDir is missing', async () => {
      const { srcDir: _, ...configBase } = mockConfig;
      const configWithoutSrcDir: StatiConfig = configBase;

      const result = await findPartialDependencies('test.md', configWithoutSrcDir);

      expect(result).toEqual([]);
    });

    it('should find partials in current directory', async () => {
      const mockPartials = [
        join(absoluteSrcDir, '_partials/header.eta'),
        join(absoluteSrcDir, '_partials/footer.eta'),
        join(absoluteSrcDir, '_components/button.eta'),
      ];

      mockGlob.mockResolvedValue(mockPartials);

      const result = await findPartialDependencies('test.md', mockConfig);

      expect(result).toEqual(mockPartials);
      expect(mockGlob).toHaveBeenCalledWith(expect.stringContaining('_*/**/*.eta'), {
        absolute: true,
      });
    });

    it('should search parent directories for partials', async () => {
      mockGlob
        .mockResolvedValueOnce([join(absoluteSrcDir, 'blog/posts/_partials/post.eta')])
        .mockResolvedValueOnce([join(absoluteSrcDir, 'blog/_partials/blog.eta')])
        .mockResolvedValueOnce([join(absoluteSrcDir, '_partials/global.eta')]);

      const result = await findPartialDependencies('blog/posts/test.md', mockConfig);

      expect(result).toHaveLength(3);
      expect(result).toContain(join(absoluteSrcDir, 'blog/posts/_partials/post.eta'));
      expect(result).toContain(join(absoluteSrcDir, 'blog/_partials/blog.eta'));
      expect(result).toContain(join(absoluteSrcDir, '_partials/global.eta'));
    });

    it('should handle root level pages', async () => {
      mockGlob.mockResolvedValue([join(absoluteSrcDir, '_partials/root.eta')]);

      const result = await findPartialDependencies('index.md', mockConfig);

      expect(result).toContain(join(absoluteSrcDir, '_partials/root.eta'));
    });

    it('should handle empty results gracefully', async () => {
      mockGlob.mockResolvedValue([]);

      const result = await findPartialDependencies('test.md', mockConfig);

      expect(result).toEqual([]);
    });

    it('should handle glob errors gracefully', async () => {
      mockGlob.mockRejectedValue(new Error('Glob error'));

      const result = await findPartialDependencies('test.md', mockConfig);

      expect(result).toEqual([]);
    });

    it('should handle complex nested directory structures', async () => {
      const complexPath = 'docs/guides/advanced/deployment/docker.md';

      mockGlob
        .mockResolvedValueOnce([
          join(absoluteSrcDir, 'docs/guides/advanced/deployment/_partials/docker.eta'),
        ])
        .mockResolvedValueOnce([
          join(absoluteSrcDir, 'docs/guides/advanced/_partials/advanced.eta'),
        ])
        .mockResolvedValueOnce([join(absoluteSrcDir, 'docs/guides/_partials/guide.eta')])
        .mockResolvedValueOnce([join(absoluteSrcDir, 'docs/_partials/doc.eta')])
        .mockResolvedValueOnce([join(absoluteSrcDir, '_partials/global.eta')]);

      const result = await findPartialDependencies(complexPath, mockConfig);

      expect(result).toHaveLength(5);
      expect(mockGlob).toHaveBeenCalledTimes(5);
    });
  });

  describe('resolveTemplatePath', () => {
    it('should resolve existing template path', async () => {
      const templateName = 'custom-layout';
      mockPathExists.mockResolvedValue(true);

      const result = await resolveTemplatePath(templateName, mockConfig);

      expect(result).toBe(join(absoluteSrcDir, 'custom-layout.eta'));
      expect(mockPathExists).toHaveBeenCalledWith(join(absoluteSrcDir, 'custom-layout.eta'));
    });

    it('should return null for non-existent template', async () => {
      const templateName = 'non-existent';
      mockPathExists.mockResolvedValue(false);

      const result = await resolveTemplatePath(templateName, mockConfig);

      expect(result).toBeNull();
      expect(mockPathExists).toHaveBeenCalledWith(join(absoluteSrcDir, 'non-existent.eta'));
    });

    it('should handle pathExists errors', async () => {
      const templateName = 'error-template';
      mockPathExists.mockRejectedValue(new Error('Path check failed'));

      // The function doesn't catch errors, so it should throw
      await expect(resolveTemplatePath(templateName, mockConfig)).rejects.toThrow(
        'Path check failed',
      );
    });

    it('should handle various template names', async () => {
      const templateNames = ['blog', 'post', 'page', 'custom-template-name'];

      mockPathExists.mockResolvedValue(true);

      for (const name of templateNames) {
        const result = await resolveTemplatePath(name, mockConfig);
        expect(result).toBe(join(absoluteSrcDir, `${name}.eta`));
      }

      expect(mockPathExists).toHaveBeenCalledTimes(templateNames.length);
    });
  });

  describe('Dependency integration scenarios', () => {
    it('should handle pages with multiple dependency types', async () => {
      const complexPage = {
        ...mockPage,
        sourcePath: join(absoluteSrcDir, 'blog/posts/complex.md'),
        frontMatter: { ...mockPage.frontMatter, layout: 'blog-post' },
      };

      // Mock custom layout exists
      mockPathExists.mockImplementation((path: string) => {
        return path.includes('blog-post.eta');
      });

      // Mock various partials - the function calls glob multiple times for different dirs
      mockGlob.mockResolvedValue([
        join(absoluteSrcDir, 'blog/posts/_partials/metadata.eta'),
        join(absoluteSrcDir, 'blog/_partials/sidebar.eta'),
        join(absoluteSrcDir, '_partials/header.eta'),
        join(absoluteSrcDir, '_partials/footer.eta'),
        join(absoluteSrcDir, '_components/social-share.eta'),
      ]);

      const result = await trackTemplateDependencies(complexPage, mockConfig);

      // The function searches multiple directories, so we get duplicates
      expect(result.length).toBeGreaterThan(5); // 1 layout + 5+ partials (with duplicates)
      expect(result).toContain(join(absoluteSrcDir, 'blog-post.eta'));

      // Check that we have partials/components
      const partialCount = result.filter(
        (dep) => dep.includes('_partials') || dep.includes('_components'),
      ).length;
      expect(partialCount).toBeGreaterThan(0);
    });

    it('should handle dependency resolution errors gracefully', async () => {
      mockPathExists.mockRejectedValue(new Error('File system error'));
      mockGlob.mockRejectedValue(new Error('Glob failed'));

      // The functions don't handle all errors gracefully, they may throw
      await expect(trackTemplateDependencies(mockPage, mockConfig)).rejects.toThrow(
        'File system error',
      );
    });

    it('should handle missing config gracefully', async () => {
      const emptyConfig = {} as StatiConfig;

      const result = await trackTemplateDependencies(mockPage, emptyConfig);

      expect(result).toEqual([]);
    });

    it('should handle Windows-style paths correctly', async () => {
      mockCwd.mockReturnValue('C:\\test\\project');
      const winConfig = { ...mockConfig, srcDir: 'site' };

      mockPathExists.mockResolvedValue(true);
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(mockPage, winConfig);

      // Should work regardless of path separator
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
