import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTemplateEngine, renderPage } from '../../core/templates.js';
import type { StatiConfig, PageModel } from '../../types.js';
import type { Eta } from 'eta';
import { join } from 'path';

// Create hoisted mocks
const { mockPathExists, mockGlob, MockEta } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockGlob: vi.fn(),
  MockEta: vi.fn(),
}));

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    pathExists: mockPathExists,
  },
}));

vi.mock('fast-glob', () => ({
  default: mockGlob,
}));

vi.mock('eta', () => ({
  Eta: MockEta,
}));

describe('templates.ts', () => {
  const mockConfig: StatiConfig = {
    srcDir: 'src',
    outDir: 'dist',
    staticDir: 'static',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  const mockProjectRoot = join('test', 'project');
  const mockPageSourcePath = join(mockProjectRoot, 'src', 'test-page.md');

  const mockPage: PageModel = {
    slug: '/test-page',
    url: '/test-page',
    sourcePath: mockPageSourcePath,
    frontMatter: {
      title: 'Test Page',
      description: 'A test page',
    },
    content: '# Test content',
  };

  let mockEtaInstance: Partial<Eta> & {
    renderAsync: ReturnType<typeof vi.fn>;
    filters: Record<string, unknown>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue(mockProjectRoot);

    mockEtaInstance = {
      renderAsync: vi.fn(),
      filters: {},
    };
    MockEta.mockReturnValue(mockEtaInstance);
    mockGlob.mockResolvedValue([]);
  });

  describe('createTemplateEngine', () => {
    it('should create Eta instance with correct configuration', () => {
      const eta = createTemplateEngine(mockConfig);

      expect(MockEta).toHaveBeenCalledWith({
        views: join(mockProjectRoot, 'src'),
        cache: process.env.NODE_ENV === 'production',
      });
      expect(eta).toBe(mockEtaInstance);
    });
  });

  describe('renderPage', () => {
    it('should render page with default layout when none specified', async () => {
      // Mock path exists for default layout discovery
      mockPathExists
        .mockResolvedValueOnce(true) // layout.eta in root exists
        .mockResolvedValue(false);

      mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered content</html>');

      const result = await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'layout.eta',
        expect.objectContaining({
          content: '<h1>Test content</h1>',
          navigation: [],
          page: expect.objectContaining({
            title: 'Test Page',
            description: 'A test page',
            path: '/test-page',
            content: '<h1>Test content</h1>',
          }),
          partials: {},
          site: {
            title: 'Test Site',
            baseUrl: 'https://example.com',
          },
        }),
      );
      expect(result).toBe('<html>Rendered content</html>');
    });

    it('should render page with specified layout', async () => {
      const pageWithLayout = {
        ...mockPage,
        frontMatter: { ...mockPage.frontMatter, layout: 'custom' },
      };

      // Mock path exists for explicit layout
      mockPathExists
        .mockResolvedValueOnce(true) // custom.eta exists
        .mockResolvedValue(false);

      mockEtaInstance.renderAsync.mockResolvedValue('<html>Custom layout</html>');

      const result = await renderPage(
        pageWithLayout,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'custom.eta',
        expect.objectContaining({
          content: '<h1>Test content</h1>',
          navigation: [],
          page: expect.objectContaining({
            title: 'Test Page',
            description: 'A test page',
            layout: 'custom',
            path: '/test-page',
            content: '<h1>Test content</h1>',
          }),
          partials: {},
          site: {
            title: 'Test Site',
            baseUrl: 'https://example.com',
          },
        }),
      );
      expect(result).toBe('<html>Custom layout</html>');
    });

    it('should use fallback when template not found', async () => {
      // Mock all path exists to return false
      mockPathExists.mockResolvedValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(consoleSpy).toHaveBeenCalledWith('No layout template found, using fallback');
      expect(result).toContain('<h1>Test content</h1>');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');

      consoleSpy.mockRestore();
    });

    it('should handle template rendering errors', async () => {
      // Mock path exists for layout.eta
      mockPathExists
        .mockResolvedValueOnce(true) // layout.eta exists
        .mockResolvedValue(false);

      const error = new Error('Template error');
      mockEtaInstance.renderAsync.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Error rendering layout layout.eta:', error);
      expect(result).toContain('<h1>Test content</h1>');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');

      consoleSpy.mockRestore();
    });

    describe('hierarchical layout discovery (layout.eta convention)', () => {
      it('should use explicit layout when specified in front matter', async () => {
        const pageWithLayout = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'blog', 'post.md'),
          frontMatter: { ...mockPage.frontMatter, layout: 'custom' },
        };

        // Mock path exists calls for layout discovery
        mockPathExists
          .mockResolvedValueOnce(true) // custom.eta exists
          .mockResolvedValue(false); // other checks

        mockEtaInstance.renderAsync.mockResolvedValue('<html>Custom layout</html>');

        const result = await renderPage(
          pageWithLayout,
          '<h1>Test content</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          'custom.eta',
          expect.objectContaining({
            page: expect.objectContaining({
              layout: 'custom',
            }),
          }),
        );
        expect(result).toBe('<html>Custom layout</html>');
      });

      it('should discover layout.eta in current directory', async () => {
        const blogPage = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'blog', 'my-post.md'),
          frontMatter: { ...mockPage.frontMatter },
        };
        delete blogPage.frontMatter.layout; // No explicit layout

        // Mock path exists calls for layout discovery
        // First check: blog/layout.eta exists
        mockPathExists
          .mockResolvedValueOnce(true) // blog/layout.eta exists
          .mockResolvedValue(false); // other checks

        mockEtaInstance.renderAsync.mockResolvedValue('<html>Blog layout</html>');

        const result = await renderPage(
          blogPage,
          '<h1>Blog post</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          'blog/layout.eta',
          expect.objectContaining({
            page: expect.objectContaining({
              title: 'Test Page',
            }),
          }),
        );
        expect(result).toBe('<html>Blog layout</html>');
      });

      it('should cascade up directory hierarchy for layout.eta', async () => {
        const deepPage = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'blog', 'tech', 'javascript', 'deep-post.md'),
          frontMatter: { ...mockPage.frontMatter },
        };
        delete deepPage.frontMatter.layout; // No explicit layout

        // Mock path exists calls for layout discovery
        // Check order: blog/tech/javascript/layout.eta -> blog/tech/layout.eta -> blog/layout.eta
        mockPathExists
          .mockResolvedValueOnce(false) // blog/tech/javascript/layout.eta doesn't exist
          .mockResolvedValueOnce(false) // blog/tech/layout.eta doesn't exist
          .mockResolvedValueOnce(true) // blog/layout.eta exists
          .mockResolvedValue(false); // other checks

        mockEtaInstance.renderAsync.mockResolvedValue('<html>Blog layout from parent</html>');

        const result = await renderPage(
          deepPage,
          '<h1>Deep post</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          'blog/layout.eta',
          expect.objectContaining({
            page: expect.objectContaining({
              title: 'Test Page',
            }),
          }),
        );
        expect(result).toBe('<html>Blog layout from parent</html>');
      });

      it('should fall back to root layout.eta', async () => {
        const rootPage = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'about.md'),
          frontMatter: { ...mockPage.frontMatter },
        };
        delete rootPage.frontMatter.layout; // No explicit layout

        // Mock path exists calls for layout discovery
        // Check order: layout.eta in root exists
        mockPathExists
          .mockResolvedValueOnce(true) // root layout.eta exists
          .mockResolvedValue(false); // other checks

        mockEtaInstance.renderAsync.mockResolvedValue('<html>Root layout</html>');

        const result = await renderPage(
          rootPage,
          '<h1>About page</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          'layout.eta',
          expect.objectContaining({
            page: expect.objectContaining({
              title: 'Test Page',
            }),
          }),
        );
        expect(result).toBe('<html>Root layout</html>');
      });

      it('should use fallback HTML when no layout.eta found', async () => {
        const rootPage = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'about.md'),
          frontMatter: { ...mockPage.frontMatter },
        };
        delete rootPage.frontMatter.layout; // No explicit layout

        // Mock path exists calls for layout discovery
        // Check order: layout.eta doesn't exist, go to fallback HTML
        mockPathExists.mockResolvedValue(false); // no layouts found

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await renderPage(
          rootPage,
          '<h1>About page</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(consoleSpy).toHaveBeenCalledWith('No layout template found, using fallback');
        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toContain('<title>Test Page</title>');
        expect(result).toContain('<h1>About page</h1>');

        consoleSpy.mockRestore();
      });

      it('should use fallback HTML when no layout templates found', async () => {
        const rootPage = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'about.md'),
          frontMatter: { ...mockPage.frontMatter },
        };
        delete rootPage.frontMatter.layout; // No explicit layout

        // Mock all path exists calls to return false
        mockPathExists.mockResolvedValue(false);

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await renderPage(
          rootPage,
          '<h1>About page</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(consoleSpy).toHaveBeenCalledWith('No layout template found, using fallback');
        expect(result).toContain('<h1>About page</h1>');
        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toContain('<title>Test Page</title>');

        consoleSpy.mockRestore();
      });

      it('should prioritize explicit layout over layout.eta', async () => {
        const blogPage = {
          ...mockPage,
          sourcePath: join(mockProjectRoot, 'src', 'blog', 'my-post.md'),
          frontMatter: { ...mockPage.frontMatter, layout: 'article' },
        };

        // Mock path exists calls - explicit layout exists
        mockPathExists
          .mockResolvedValueOnce(true) // article.eta exists
          .mockResolvedValue(false); // other checks not needed

        mockEtaInstance.renderAsync.mockResolvedValue('<html>Article layout</html>');

        const result = await renderPage(
          blogPage,
          '<h1>Blog post</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          'article.eta',
          expect.objectContaining({
            page: expect.objectContaining({
              layout: 'article',
            }),
          }),
        );
        expect(result).toBe('<html>Article layout</html>');
      });
    });
  });
});
