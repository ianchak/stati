import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTemplateEngine, renderPage } from '../../core/templates.js';
import type { StatiConfig, PageModel } from '../../types.js';
import type { Eta } from 'eta';

// Create hoisted mocks
const { mockPathExists, mockGlob, MockEta } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockGlob: vi.fn(),
  MockEta: vi.fn(),
}));

// Mock dependencies
vi.mock('fs-extra', () => ({
  pathExists: mockPathExists,
}));

vi.mock('fast-glob', () => ({
  default: mockGlob,
  glob: mockGlob,
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

  let mockEtaInstance: Partial<Eta> & {
    renderAsync: ReturnType<typeof vi.fn>;
    filters: Record<string, unknown>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('\\test\\project');

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
        views: '\\test\\project\\src',
        cache: false,
      });
      expect(eta).toBe(mockEtaInstance);
    });
  });

  describe('renderPage', () => {
    it('should render page with default layout when none specified', async () => {
      mockPathExists.mockResolvedValue(true);
      mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered content</html>');

      const result = await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'default.eta',
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
      mockPathExists.mockResolvedValue(true);
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
      mockPathExists.mockResolvedValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Template not found: default.eta, using fallback');
      expect(result).toContain('<h1>Test content</h1>');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');

      consoleSpy.mockRestore();
    });

    it('should handle template rendering errors', async () => {
      mockPathExists.mockResolvedValue(true);
      const error = new Error('Template error');
      mockEtaInstance.renderAsync.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as Eta,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Error rendering layout default.eta:', error);
      expect(result).toContain('<h1>Test content</h1>');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');

      consoleSpy.mockRestore();
    });
  });
});
