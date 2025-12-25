import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import type { PageModel, StatiConfig } from '../../../src/types/index.js';

// Mock fs-extra and fast-glob - use factory functions to avoid hoisting issues
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
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
  resolveTemplatePath,
  clearTemplatePathCache,
} from '../../../src/core/isg/deps.js';

describe('ISG Dependency Tracking', () => {
  // Use POSIX-style paths for consistency in test comparisons
  const testCwd = 'test/project';
  const testSrcDir = 'site';
  const absoluteSrcDir = `${testCwd}/${testSrcDir}`;

  // Get references to the mocked functions
  let mockPathExists: ReturnType<typeof vi.fn>;
  let mockReadFile: ReturnType<typeof vi.fn>;
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
    sourcePath: `${absoluteSrcDir}/test.md`,
    url: '/test',
    frontMatter: {
      title: 'Test Page',
    },
    content: 'Test content',
    publishedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    clearTemplatePathCache();
    mockCwd.mockReturnValue(testCwd);

    // Get the mocked modules
    const fsExtra = await import('fs-extra');
    const glob = await import('fast-glob');

    mockPathExists = vi.mocked(fsExtra.default.pathExists);
    mockReadFile = vi.mocked(fsExtra.default.readFile);
    mockGlob = vi.mocked(glob.default);

    // Set up default mocks for readFile to prevent warnings
    mockReadFile.mockResolvedValue('template content');
  });

  describe('trackTemplateDependencies', () => {
    it('should return empty array when srcDir is missing', async () => {
      const { srcDir: _, ...configBase } = mockConfig;
      const configWithoutSrcDir: StatiConfig = configBase;

      const result = await trackTemplateDependencies(mockPage, configWithoutSrcDir);

      expect(result).toEqual([]);
    });

    it('should track layout and partial dependencies', async () => {
      // Layout content that includes partials
      const layoutContent = `
        <!DOCTYPE html>
        <%~ stati.partials.header() %>
        <%~ stati.partials.footer() %>
      `;

      // Define the expected partial paths (in underscore directories)
      const headerPath = 'test/project/site/_partials/header.eta';
      const footerPath = 'test/project/site/_partials/footer.eta';

      // Mock file existence - be specific about paths that exist
      // Layout is at root, partials are in _partials directory
      mockPathExists.mockImplementation((path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        // Layout exists at root level
        if (normalizedPath === 'test/project/site/layout.eta') {
          return true;
        }
        // Partials exist in _partials directory
        if (normalizedPath === headerPath || normalizedPath === footerPath) {
          return true;
        }
        return false;
      });

      // Mock file content
      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) {
          return layoutContent;
        }
        return ''; // Partials have no further dependencies
      });

      // Mock glob to resolve partial paths
      // The glob pattern will be like: test/project/site/_*/header.eta (with forward slashes)
      mockGlob.mockImplementation(async (pattern: string) => {
        // Pattern looks like: test/project/site/_*/header.eta
        if (pattern.includes('header.eta')) {
          return [headerPath];
        }
        if (pattern.includes('footer.eta')) {
          return [footerPath];
        }
        return [];
      });

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      expect(result).toHaveLength(3);
      // Check for POSIX-formatted paths
      const layoutDep = result.find((p) => p.includes('layout.eta'));
      expect(layoutDep).toBeDefined();
      expect(layoutDep).not.toContain('\\');

      const headerDep = result.find((p) => p.includes('header.eta'));
      expect(headerDep).toBeDefined();

      const footerDep = result.find((p) => p.includes('footer.eta'));
      expect(footerDep).toBeDefined();
    });

    it('should only include actually-used partials (ISSUE-002 fix)', async () => {
      // Layout that only uses header and footer, not hero or sidebar
      const layoutContent = `
        <!DOCTYPE html>
        <%~ stati.partials.header() %>
        <main><%~ stati.content %></main>
        <%~ stati.partials.footer() %>
      `;

      // Glob returns paths for partial resolution - use POSIX paths
      const headerPath = 'test/project/site/_partials/header.eta';
      const footerPath = 'test/project/site/_partials/footer.eta';
      const heroPath = 'test/project/site/_partials/hero.eta';
      const sidebarPath = 'test/project/site/_partials/sidebar.eta';

      // Mock file existence - only layout at root, partials in _partials dir
      mockPathExists.mockImplementation((path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        // Layout exists at root level
        if (normalizedPath === 'test/project/site/layout.eta') {
          return true;
        }
        // Partials exist in _partials directory (all 4 of them)
        if (
          normalizedPath === headerPath ||
          normalizedPath === footerPath ||
          normalizedPath === heroPath ||
          normalizedPath === sidebarPath
        ) {
          return true;
        }
        return false;
      });

      // Layout content
      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) {
          return layoutContent;
        }
        return ''; // Partials have no further dependencies
      });

      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('header.eta')) {
          return [headerPath];
        }
        if (pattern.includes('footer.eta')) {
          return [footerPath];
        }
        if (pattern.includes('hero.eta')) {
          return [heroPath];
        }
        if (pattern.includes('sidebar.eta')) {
          return [sidebarPath];
        }
        return [];
      });

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      // Should include layout + only the 2 used partials
      expect(result).toHaveLength(3);

      // Should include used partials
      expect(result.some((p) => p.includes('header.eta'))).toBe(true);
      expect(result.some((p) => p.includes('footer.eta'))).toBe(true);

      // Should NOT include unused partials (hero and sidebar exist but aren't referenced)
      expect(result.some((p) => p.includes('hero.eta'))).toBe(false);
      expect(result.some((p) => p.includes('sidebar.eta'))).toBe(false);
    });

    it('should track non-callable partials (without parentheses)', async () => {
      // Layout uses non-callable syntax like docs-site: <%~ stati.partials.header %>
      const layoutContent = `
        <!DOCTYPE html>
        <%~ stati.partials.header %>
        <%~ stati.partials.sidebar %>
        <main><%~ stati.content %></main>
        <%~ stati.partials.footer %>
      `;

      const headerPath = 'test/project/site/_sections/header.eta';
      const sidebarPath = 'test/project/site/_sections/sidebar.eta';
      const footerPath = 'test/project/site/_sections/footer.eta';

      mockPathExists.mockImplementation((path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath === 'test/project/site/layout.eta') return true;
        if (
          normalizedPath === headerPath ||
          normalizedPath === sidebarPath ||
          normalizedPath === footerPath
        )
          return true;
        return false;
      });

      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) return layoutContent;
        return '';
      });

      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('header.eta')) return [headerPath];
        if (pattern.includes('sidebar.eta')) return [sidebarPath];
        if (pattern.includes('footer.eta')) return [footerPath];
        return [];
      });

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      // Should include layout + all 3 non-callable partials
      expect(result).toHaveLength(4);
      expect(result.some((p) => p.includes('layout.eta'))).toBe(true);
      expect(result.some((p) => p.includes('header.eta'))).toBe(true);
      expect(result.some((p) => p.includes('sidebar.eta'))).toBe(true);
      expect(result.some((p) => p.includes('footer.eta'))).toBe(true);
    });

    it('should track mixed callable and non-callable partials', async () => {
      // Layout uses both styles (common in real-world scenarios)
      const layoutContent = `
        <!DOCTYPE html>
        <%~ stati.partials.header %>
        <%~ stati.partials.nav({ items: navItems }) %>
        <main><%~ stati.content %></main>
        <%~ stati.partials['footer'] %>
      `;

      const headerPath = 'test/project/site/_sections/header.eta';
      const navPath = 'test/project/site/_components/nav.eta';
      const footerPath = 'test/project/site/_sections/footer.eta';

      mockPathExists.mockImplementation((path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath === 'test/project/site/layout.eta') return true;
        if (
          normalizedPath === headerPath ||
          normalizedPath === navPath ||
          normalizedPath === footerPath
        )
          return true;
        return false;
      });

      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) return layoutContent;
        return '';
      });

      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('header.eta')) return [headerPath];
        if (pattern.includes('nav.eta')) return [navPath];
        if (pattern.includes('footer.eta')) return [footerPath];
        return [];
      });

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      // Should include layout + all 3 partials (mix of callable and non-callable)
      expect(result).toHaveLength(4);
      expect(result.some((p) => p.includes('layout.eta'))).toBe(true);
      expect(result.some((p) => p.includes('header.eta'))).toBe(true);
      expect(result.some((p) => p.includes('nav.eta'))).toBe(true);
      expect(result.some((p) => p.includes('footer.eta'))).toBe(true);
    });

    it('should handle explicit layout in front matter', async () => {
      const pageWithLayout = {
        ...mockPage,
        frontMatter: { ...mockPage.frontMatter, layout: 'custom' },
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('custom.eta');
      });
      mockReadFile.mockResolvedValue(''); // Empty template, no partials
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(pageWithLayout, mockConfig);

      // Check that result contains a path with custom.eta (POSIX format)
      const customLayout = result.find((p) => p.includes('custom.eta'));
      expect(customLayout).toBeDefined();
      expect(customLayout).not.toContain('\\');
      // Note: internally uses join() which produces native path separators
      expect(mockPathExists).toHaveBeenCalledWith(join(absoluteSrcDir, 'custom.eta'));
    });

    it('should handle collection index pages', async () => {
      const indexPage = {
        ...mockPage,
        slug: 'index',
        url: '/blog/',
        sourcePath: `${absoluteSrcDir}/blog/index.md`,
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('blog') && path.includes('index.eta');
      });
      mockReadFile.mockResolvedValue(''); // Empty template
      mockGlob.mockResolvedValue([]);

      await trackTemplateDependencies(indexPage, mockConfig);

      // Should check for index.eta before layout.eta for index pages
      // Note: internally uses join() which produces native path separators
      expect(mockPathExists).toHaveBeenCalledWith(join(absoluteSrcDir, 'blog/index.eta'));
    });

    it('should fallback to layout.eta when index.eta not found', async () => {
      const indexPage = {
        ...mockPage,
        slug: 'index',
        url: '/',
        sourcePath: `${absoluteSrcDir}/index.md`,
      };

      mockPathExists.mockImplementation((path: string) => {
        return path.includes('layout.eta') && !path.includes('index.eta');
      });
      mockReadFile.mockResolvedValue(''); // Empty template
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(indexPage, mockConfig);

      // Check for POSIX-formatted path
      const layoutPath = result.find((p) => p.includes('layout.eta'));
      expect(layoutPath).toBeDefined();
      expect(layoutPath).not.toContain('\\');
    });

    it('should handle nested page paths', async () => {
      const nestedPage = {
        ...mockPage,
        sourcePath: `${absoluteSrcDir}/blog/posts/deep/nested.md`,
      };

      // Layout uses shared and blog-header partials
      const layoutContent = `<%~ stati.partials.shared() %><%~ stati.partials['blog-header']() %>`;

      // Use POSIX paths for glob results
      const sharedPath = 'test/project/site/_partials/shared.eta';
      const blogHeaderPath = 'test/project/site/blog/_partials/blog-header.eta';

      // Mock file existence - layout at root, partials in underscore dirs
      mockPathExists.mockImplementation((path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        // Layout exists at root level
        if (normalizedPath === 'test/project/site/layout.eta') {
          return true;
        }
        // Partials exist in underscore directories
        if (normalizedPath === sharedPath || normalizedPath === blogHeaderPath) {
          return true;
        }
        return false;
      });

      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) return layoutContent;
        return '';
      });

      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('shared.eta')) {
          return [sharedPath];
        }
        if (pattern.includes('blog-header.eta')) {
          return [blogHeaderPath];
        }
        return [];
      });

      const result = await trackTemplateDependencies(nestedPage, mockConfig);

      // Should find layout file
      const hasLayout = result.some((dep) => dep.includes('layout.eta'));
      expect(hasLayout).toBe(true);

      // Should find the partials that are actually used
      expect(result.some((p) => p.includes('shared.eta'))).toBe(true);
      expect(result.some((p) => p.includes('blog-header.eta'))).toBe(true);
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
        sourcePath: `${absoluteSrcDir}/blog/posts/complex.md`,
        frontMatter: { ...mockPage.frontMatter, layout: 'blog-post' },
      };

      // Template that uses multiple partials
      const layoutContent = `
        <%~ stati.partials.header() %>
        <%~ stati.partials.sidebar() %>
        <%~ stati.partials['social-share']() %>
        <%~ stati.content %>
        <%~ stati.partials.footer() %>
      `;

      // Use POSIX paths for partial locations
      const headerPath = 'test/project/site/_partials/header.eta';
      const sidebarPath = 'test/project/site/blog/_partials/sidebar.eta';
      const socialSharePath = 'test/project/site/_components/social-share.eta';
      const footerPath = 'test/project/site/_partials/footer.eta';

      // Mock file existence - be specific about where files exist
      mockPathExists.mockImplementation((path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        // Layout exists at root level
        if (normalizedPath === 'test/project/site/blog-post.eta') {
          return true;
        }
        // Partials exist in underscore directories
        if (
          normalizedPath === headerPath ||
          normalizedPath === sidebarPath ||
          normalizedPath === socialSharePath ||
          normalizedPath === footerPath
        ) {
          return true;
        }
        return false;
      });

      // Mock file content
      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('blog-post.eta')) return layoutContent;
        return '';
      });

      // Mock glob to resolve partial paths
      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('header.eta')) return [headerPath];
        if (pattern.includes('sidebar.eta')) return [sidebarPath];
        if (pattern.includes('social-share.eta')) return [socialSharePath];
        if (pattern.includes('footer.eta')) return [footerPath];
        return [];
      });

      const result = await trackTemplateDependencies(complexPage, mockConfig);

      // Should include layout + 4 partials
      expect(result.length).toBe(5);

      // Check layout is included
      expect(result.some((p) => p.includes('blog-post.eta'))).toBe(true);

      // Check that we have partials/components
      expect(result.some((p) => p.includes('header.eta'))).toBe(true);
      expect(result.some((p) => p.includes('sidebar.eta'))).toBe(true);
      expect(result.some((p) => p.includes('social-share.eta'))).toBe(true);
      expect(result.some((p) => p.includes('footer.eta'))).toBe(true);
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
      mockReadFile.mockResolvedValue(''); // Empty template
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(mockPage, winConfig);

      // Should work regardless of path separator
      expect(Array.isArray(result)).toBe(true);
    });

    it('should normalize all deps paths to POSIX format (forward slashes)', async () => {
      // This test verifies ISSUE-001 fix: consistent path separators in deps array
      mockCwd.mockReturnValue('C:\\test\\project');
      const winConfig = { ...mockConfig, srcDir: 'site' };

      // Layout content that includes partials
      const layoutContent = `<%~ stati.partials.header() %><%~ stati.partials.footer() %>`;

      // Mock layout discovery - pathExists returns true for layout.eta and partials
      mockPathExists.mockImplementation((path: string) => {
        return (
          path.includes('layout.eta') || path.includes('header.eta') || path.includes('footer.eta')
        );
      });

      mockReadFile.mockImplementation(async (path: string) => {
        if (path.includes('layout.eta')) return layoutContent;
        return '';
      });

      // Mock glob to return paths with forward slashes (as glob does)
      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('header.eta')) {
          return ['C:/test/project/site/_partials/header.eta'];
        }
        if (pattern.includes('footer.eta')) {
          return ['C:/test/project/site/_partials/footer.eta'];
        }
        return [];
      });

      const result = await trackTemplateDependencies(mockPage, winConfig);

      // All paths should use forward slashes (POSIX format)
      for (const dep of result) {
        expect(dep).not.toContain('\\');
        // Verify it uses forward slashes
        if (dep.includes('/')) {
          expect(dep.split('/').length).toBeGreaterThan(1);
        }
      }

      // Layout path specifically should be normalized
      const layoutDep = result.find((d) => d.includes('layout.eta'));
      expect(layoutDep).toBeDefined();
      expect(layoutDep).not.toContain('\\');
    });

    it('should track callable partial dependencies from template content', async () => {
      // Create a page with a layout that uses callable partials
      const pageWithCallablePartials = {
        ...mockPage,
        sourcePath: `${absoluteSrcDir}/test.md`,
      };

      // Mock layout file content with callable partial syntax
      const layoutContent = `
        <!DOCTYPE html>
        <html>
          <body>
            <%~ stati.partials.header() %>
            <%~ stati.partials.hero({ title: 'Welcome' }) %>
            <main><%~ stati.content %></main>
            <%~ stati.partials['footer']() %>
          </body>
        </html>
      `;

      // Use POSIX paths for glob results
      const headerPath = 'test/project/site/_partials/header.eta';
      const heroPath = 'test/project/site/_partials/hero.eta';
      const footerPath = 'test/project/site/_partials/footer.eta';

      // Mock pathExists - be specific about where files exist
      mockPathExists.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        // Layout exists at root level
        if (normalizedPath === 'test/project/site/layout.eta') {
          return true;
        }
        // Partials exist in _partials directory
        if (
          normalizedPath === headerPath ||
          normalizedPath === heroPath ||
          normalizedPath === footerPath
        ) {
          return true;
        }
        return false;
      });

      // Mock readFile to return layout content with callable partials
      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) {
          return layoutContent;
        }
        return ''; // Partials have no further dependencies
      });

      // Mock glob to resolve partial paths individually
      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('header.eta')) {
          return [headerPath];
        }
        if (pattern.includes('hero.eta')) {
          return [heroPath];
        }
        if (pattern.includes('footer.eta')) {
          return [footerPath];
        }
        return [];
      });

      const result = await trackTemplateDependencies(pageWithCallablePartials, mockConfig);

      // Should include layout and all used partials
      expect(result.some((p) => p.includes('layout.eta'))).toBe(true);
      expect(result.some((p) => p.includes('header.eta'))).toBe(true);
      expect(result.some((p) => p.includes('hero.eta'))).toBe(true);
      expect(result.some((p) => p.includes('footer.eta'))).toBe(true);

      // All paths should be in POSIX format
      for (const dep of result) {
        expect(dep).not.toContain('\\');
      }
    });

    it('should throw CircularDependencyError for self-referencing partials', async () => {
      // When a partial references itself, it creates a circular dependency that should throw
      const layoutContent = `<%~ stati.partials.recursive() %>`;
      const recursiveContent = `<%~ stati.partials.recursive() %>`;

      const recursivePath = 'test/project/site/_partials/recursive.eta';

      mockPathExists.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        return (
          normalizedPath === 'test/project/site/layout.eta' || normalizedPath === recursivePath
        );
      });

      mockReadFile.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.includes('layout.eta')) {
          return layoutContent;
        }
        if (normalizedPath.includes('recursive.eta')) {
          return recursiveContent;
        }
        return '';
      });

      mockGlob.mockImplementation(async (pattern: string) => {
        if (pattern.includes('recursive.eta')) {
          return [recursivePath];
        }
        return [];
      });

      // Should throw CircularDependencyError for self-referencing templates
      await expect(trackTemplateDependencies(mockPage, mockConfig)).rejects.toThrow(
        'Circular dependency detected in templates',
      );
    });

    it('should handle empty template content gracefully', async () => {
      // Layout exists but has no content
      mockPathExists.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedPath === 'test/project/site/layout.eta';
      });

      // Return empty string for template content
      mockReadFile.mockImplementation(async () => '');
      mockGlob.mockResolvedValue([]);

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      // Should return only the layout (no partials since template is empty)
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('layout.eta');
    });

    it('should handle template parsing errors gracefully', async () => {
      // Layout exists but reading throws an error
      mockPathExists.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedPath === 'test/project/site/layout.eta';
      });

      // Throw error when reading template
      mockReadFile.mockImplementation(async () => {
        throw new Error('Permission denied');
      });
      mockGlob.mockResolvedValue([]);

      // Spy on console.warn to verify error is logged
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await trackTemplateDependencies(mockPage, mockConfig);

      // Should still return the layout path (even though parsing failed)
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('layout.eta');

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not parse template'),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Template caching', () => {
    it('should cache template content reads', async () => {
      const layoutPath = 'test/project/site/layout.eta';
      const layoutContent = '<!DOCTYPE html><%~ stati.body %>';

      mockPathExists.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedPath === layoutPath;
      });

      let readCount = 0;
      mockReadFile.mockImplementation(async () => {
        readCount++;
        return layoutContent;
      });
      mockGlob.mockResolvedValue([]);

      // Track dependencies twice
      await trackTemplateDependencies(mockPage, mockConfig);
      await trackTemplateDependencies(mockPage, mockConfig);

      // Content should only be read once (cached)
      expect(readCount).toBe(1);
    });

    it('should cache template path with .eta extension', async () => {
      mockPathExists.mockResolvedValue(true);

      const path1 = await resolveTemplatePath('layout', mockConfig);
      const path2 = await resolveTemplatePath('layout', mockConfig);

      expect(path1).toBe(path2);
      expect(path1).toContain('layout.eta');
    });

    it('should clear content cache when clearTemplatePathCache is called', async () => {
      const layoutPath = 'test/project/site/layout.eta';
      const layoutContent = '<!DOCTYPE html>';

      mockPathExists.mockImplementation(async (path: string) => {
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedPath === layoutPath;
      });

      let readCount = 0;
      mockReadFile.mockImplementation(async () => {
        readCount++;
        return layoutContent;
      });
      mockGlob.mockResolvedValue([]);

      // First tracking (populates content cache)
      await trackTemplateDependencies(mockPage, mockConfig);
      expect(readCount).toBe(1);

      // Second tracking (uses cache)
      await trackTemplateDependencies(mockPage, mockConfig);
      expect(readCount).toBe(1); // Still 1 due to cache

      // Clear cache
      clearTemplatePathCache();

      // Third tracking (cache cleared, should read again)
      await trackTemplateDependencies(mockPage, mockConfig);
      expect(readCount).toBe(2); // Increased after cache clear
    });
  });
});
