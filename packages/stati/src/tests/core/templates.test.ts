import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTemplateEngine, renderPage } from '../../core/templates.js';
import type { StatiConfig, PageModel } from '../../types.js';

// Create hoisted mocks
const { mockPathExists, MockEta } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  MockEta: vi.fn(),
}));

// Mock dependencies
vi.mock('fs-extra', () => ({
  pathExists: mockPathExists,
}));

vi.mock('eta', () => ({
  Eta: MockEta,
}));

describe('templates.ts', () => {
  const mockConfig: StatiConfig = {
    srcDir: 'src',
    outDir: 'dist',
    templateDir: 'templates',
    staticDir: 'static',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  const mockPage: PageModel = {
    slug: '/test-page',
    url: '/test-page',
    sourcePath: '/src/test-page.md',
    frontMatter: {
      title: 'Test Page',
      description: 'A test page',
    },
    content: '# Test content',
  };

  let mockEtaInstance: {
    renderAsync: ReturnType<typeof vi.fn>;
    filters: Record<string, unknown>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

    // Create mock Eta instance
    mockEtaInstance = {
      renderAsync: vi.fn(),
      filters: {},
    };

    MockEta.mockImplementation(() => mockEtaInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTemplateEngine', () => {
    it('should create Eta instance with correct configuration', () => {
      const eta = createTemplateEngine(mockConfig);

      expect(MockEta).toHaveBeenCalledWith({
        views: expect.stringMatching(/[\\/]test[\\/]project[\\/]templates$/),
        cache: false, // Should be false for non-production
      });
      expect(eta).toBe(mockEtaInstance);
    });

    it('should enable cache in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      createTemplateEngine(mockConfig);

      expect(MockEta).toHaveBeenCalledWith({
        views: expect.stringMatching(/[\\/]test[\\/]project[\\/]templates$/),
        cache: true,
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should add custom filters when provided', () => {
      const customFilter = vi.fn();
      const configWithFilters: StatiConfig = {
        ...mockConfig,
        eta: {
          filters: {
            uppercase: customFilter,
          },
        },
      };

      createTemplateEngine(configWithFilters);

      expect(mockEtaInstance.filters.uppercase).toBe(customFilter);
    });

    it('should work without eta configuration', () => {
      const config: StatiConfig = {
        ...mockConfig,
      };

      const eta = createTemplateEngine(config);

      expect(MockEta).toHaveBeenCalledWith({
        views: expect.stringMatching(/[\\/]test[\\/]project[\\/]templates$/),
        cache: expect.any(Boolean),
      });
      expect(eta).toBe(mockEtaInstance);
    });

    it('should work with empty eta configuration', () => {
      const config: StatiConfig = {
        ...mockConfig,
        eta: {},
      };

      const eta = createTemplateEngine(config);

      expect(MockEta).toHaveBeenCalledWith({
        views: expect.stringMatching(/[\\/]test[\\/]project[\\/]templates$/),
        cache: expect.any(Boolean),
      });
      expect(eta).toBe(mockEtaInstance);
    });

    it('should handle multiple custom filters', () => {
      const filter1 = vi.fn();
      const filter2 = vi.fn();
      const configWithFilters: StatiConfig = {
        ...mockConfig,
        eta: {
          filters: {
            filter1,
            filter2,
          },
        },
      };

      createTemplateEngine(configWithFilters);

      expect(mockEtaInstance.filters.filter1).toBe(filter1);
      expect(mockEtaInstance.filters.filter2).toBe(filter2);
    });
  });

  describe('renderPage', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered content</html>');
    });

    it('should render page with default layout', async () => {
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';

      const result = await renderPage(mockPage, body, mockConfig, eta);

      expect(mockPathExists).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]templates[\\/]default\.eta$/),
      );
      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith('default.eta', {
        site: mockConfig.site,
        page: {
          ...mockPage.frontMatter,
          path: mockPage.url,
          content: body,
        },
        content: body,
        navigation: [],
      });
      expect(result).toBe('<html>Rendered content</html>');
    });

    it('should use custom layout from frontmatter', async () => {
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';
      const pageWithLayout: PageModel = {
        ...mockPage,
        frontMatter: {
          ...mockPage.frontMatter,
          layout: 'custom',
        },
      };

      await renderPage(pageWithLayout, body, mockConfig, eta);

      expect(mockPathExists).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]templates[\\/]custom\.eta$/),
      );
      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith('custom.eta', expect.any(Object));
    });

    it('should pass correct context to template', async () => {
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';

      await renderPage(mockPage, body, mockConfig, eta);

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith('default.eta', {
        site: {
          title: 'Test Site',
          baseUrl: 'https://example.com',
        },
        page: {
          title: 'Test Page',
          description: 'A test page',
          path: '/test-page',
          content: body,
        },
        content: body,
        navigation: [],
      });
    });

    it('should use fallback HTML when template does not exist', async () => {
      mockPathExists.mockResolvedValue(false);
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';

      const result = await renderPage(mockPage, body, mockConfig, eta);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<meta name="description" content="A test page">');
      expect(result).toContain('<h1>Test content</h1>');
    });

    it('should use fallback HTML when template rendering fails', async () => {
      mockPathExists.mockResolvedValue(true);
      mockEtaInstance.renderAsync.mockRejectedValue(new Error('Template error'));
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';

      const result = await renderPage(mockPage, body, mockConfig, eta);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');
    });

    it('should escape HTML in fallback template', async () => {
      mockPathExists.mockResolvedValue(false);
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';
      const pageWithSpecialChars: PageModel = {
        ...mockPage,
        frontMatter: {
          title: 'Test & "Special" <chars>',
          description: 'A test with <script>alert("xss")</script>',
        },
      };

      const result = await renderPage(pageWithSpecialChars, body, mockConfig, eta);

      expect(result).toContain('<title>Test &amp; &quot;Special&quot; &lt;chars&gt;</title>');
      expect(result).toContain(
        'content="A test with &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"',
      );
    });

    it('should handle page without title in fallback', async () => {
      mockPathExists.mockResolvedValue(false);
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';
      const pageWithoutTitle: PageModel = {
        ...mockPage,
        frontMatter: {},
      };

      const result = await renderPage(pageWithoutTitle, body, mockConfig, eta);

      expect(result).toContain('<title>Untitled</title>');
      expect(result).not.toContain('<meta name="description"');
    });

    it('should handle page without description in fallback', async () => {
      mockPathExists.mockResolvedValue(false);
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';
      const pageWithoutDescription: PageModel = {
        ...mockPage,
        frontMatter: {
          title: 'Test Page',
        },
      };

      const result = await renderPage(pageWithoutDescription, body, mockConfig, eta);

      expect(result).toContain('<title>Test Page</title>');
      expect(result).not.toContain('<meta name="description"');
    });

    it('should log warning when template not found', async () => {
      mockPathExists.mockResolvedValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';

      await renderPage(mockPage, body, mockConfig, eta);

      expect(consoleSpy).toHaveBeenCalledWith('Template not found: default.eta, using fallback');

      consoleSpy.mockRestore();
    });

    it('should log error when template rendering fails', async () => {
      mockPathExists.mockResolvedValue(true);
      const error = new Error('Template error');
      mockEtaInstance.renderAsync.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const eta = createTemplateEngine(mockConfig);
      const body = '<h1>Test content</h1>';

      await renderPage(mockPage, body, mockConfig, eta);

      expect(consoleSpy).toHaveBeenCalledWith('Error rendering layout default.eta:', error);

      consoleSpy.mockRestore();
    });
  });
});
