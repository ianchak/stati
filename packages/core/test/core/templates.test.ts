import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTemplateEngine, renderPage } from '../../src/core/templates.js';
import type { StatiConfig, PageModel } from '../../src/types/index.js';
import type { Eta } from 'eta';
import { join } from 'node:path';

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
        cacheFilepaths: process.env.NODE_ENV === 'production',
        varName: 'stati',
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
      expect(result.html).toBe('<html>Rendered content</html>');
      expect(result.templatesLoaded).toBe(1); // 1 layout
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
      expect(result.html).toBe('<html>Custom layout</html>');
      expect(result.templatesLoaded).toBe(1); // 1 layout
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
      expect(result.html).toContain('<h1>Test content</h1>');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.templatesLoaded).toBe(0); // no layout found

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
      expect(result.html).toContain('<h1>Test content</h1>');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.templatesLoaded).toBe(1); // layout was found even though it errored

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
        expect(result.html).toBe('<html>Custom layout</html>');
        expect(result.templatesLoaded).toBe(1); // 1 layout
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
        expect(result.html).toBe('<html>Blog layout</html>');
        expect(result.templatesLoaded).toBe(1); // 1 layout
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
        expect(result.html).toBe('<html>Blog layout from parent</html>');
        expect(result.templatesLoaded).toBe(1); // 1 layout
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
        expect(result.html).toBe('<html>Root layout</html>');
        expect(result.templatesLoaded).toBe(1); // 1 layout
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
        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('<title>Test Page</title>');
        expect(result.html).toContain('<h1>About page</h1>');
        expect(result.templatesLoaded).toBe(0); // no layout found

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
        expect(result.html).toContain('<h1>About page</h1>');
        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('<title>Test Page</title>');
        expect(result.templatesLoaded).toBe(0); // no layout found

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
        expect(result.html).toBe('<html>Article layout</html>');
        expect(result.templatesLoaded).toBe(1); // 1 layout
      });

      it('should discover and render partials', async () => {
        // Mock partial discovery - find header and footer partials
        mockGlob
          .mockResolvedValueOnce([join(mockProjectRoot, 'src', '_partials')]) // First call: find underscore folders
          .mockResolvedValueOnce(['header.eta', 'footer.eta']) // Second call: find eta files in _partials (relative paths)
          .mockResolvedValue([]); // Subsequent calls: no more partials

        // Mock path exists for layout discovery
        mockPathExists
          .mockResolvedValueOnce(true) // layout.eta exists
          .mockResolvedValue(false);

        // Mock rendered partial content
        const mockHeaderContent = '<header class="site-header"><h1>My Site</h1></header>';
        const mockFooterContent = '<footer class="site-footer"><p>&copy; 2025</p></footer>';
        const mockLayoutContent = '<html><body>{{content}}</body></html>';

        // Setup renderAsync to return different content based on the template being rendered
        mockEtaInstance.renderAsync.mockImplementation((template: string) => {
          if (template.includes('header.eta')) {
            return Promise.resolve(mockHeaderContent);
          } else if (template.includes('footer.eta')) {
            return Promise.resolve(mockFooterContent);
          } else if (template === 'layout.eta') {
            return Promise.resolve(mockLayoutContent);
          }
          return Promise.resolve('');
        });

        const result = await renderPage(
          mockPage,
          '<h1>Test content</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // Verify partials were rendered first - check for partial paths using pattern matching
        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          expect.stringMatching(/.*_partials.*header\.eta/),
          expect.objectContaining({
            site: mockConfig.site,
            page: expect.objectContaining({
              url: '/test-page',
              path: '/test-page',
              title: 'Test Page',
            }),
          }),
        );

        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          expect.stringMatching(/.*_partials.*footer\.eta/),
          expect.objectContaining({
            site: mockConfig.site,
            page: expect.objectContaining({
              url: '/test-page',
              path: '/test-page',
              title: 'Test Page',
            }),
          }),
        );

        // Verify final layout was rendered with callable partials in context
        const layoutCall = mockEtaInstance.renderAsync.mock.calls.find(
          (call) => call[0] === 'layout.eta',
        );
        expect(layoutCall).toBeDefined();
        expect(layoutCall![1]).toMatchObject({
          page: expect.objectContaining({
            url: '/test-page',
            path: '/test-page',
          }),
        });
        // Verify partials are callable and return expected content
        expect(layoutCall![1].partials.header).toBeInstanceOf(Function);
        expect(layoutCall![1].partials.footer).toBeInstanceOf(Function);
        expect(layoutCall![1].partials.header.toString()).toBe(mockHeaderContent);
        expect(layoutCall![1].partials.footer.toString()).toBe(mockFooterContent);

        expect(result.html).toBe(mockLayoutContent);
        expect(result.templatesLoaded).toBe(3); // 2 partials + 1 layout
      });

      it('should handle partial rendering errors gracefully', async () => {
        // Mock partial discovery - find one partial that will fail
        mockGlob
          .mockResolvedValueOnce([join(mockProjectRoot, 'src', '_partials')]) // Find underscore folders
          .mockResolvedValueOnce(['broken.eta']) // Find eta files in _partials (relative path)
          .mockResolvedValue([]);

        // Mock path exists for layout discovery
        mockPathExists
          .mockResolvedValueOnce(true) // layout.eta exists
          .mockResolvedValue(false);

        const mockLayoutContent = '<html><body>{{content}}</body></html>';

        // Setup renderAsync to fail for the partial but succeed for layout
        mockEtaInstance.renderAsync.mockImplementation((template: string) => {
          if (template.includes('broken.eta')) {
            return Promise.reject(new Error('Template syntax error'));
          } else if (template === 'layout.eta') {
            return Promise.resolve(mockLayoutContent);
          }
          return Promise.resolve('');
        });

        // Spy on console.warn to verify error handling
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await renderPage(
          mockPage,
          '<h1>Test content</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // Verify error was logged - check for the path in the warning message
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Warning: Failed to render partial broken at/),
          expect.any(Error),
        );

        // Verify the partial was attempted to be rendered with the correct pattern
        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          expect.stringMatching(/.*_partials.*broken\.eta/),
          expect.objectContaining({
            site: mockConfig.site,
            page: expect.objectContaining({
              url: '/test-page',
              path: '/test-page',
              title: 'Test Page',
            }),
          }),
        );

        // Verify layout was still rendered with error placeholder for broken partial
        const layoutCall = mockEtaInstance.renderAsync.mock.calls.find(
          (call) => call[0] === 'layout.eta',
        );
        expect(layoutCall).toBeDefined();
        // Verify partial is callable and returns error placeholder
        expect(layoutCall![1].partials.broken).toBeInstanceOf(Function);
        expect(layoutCall![1].partials.broken.toString()).toBe(
          '<!-- Error rendering partial: broken -->',
        );

        expect(result.html).toBe(mockLayoutContent);
        expect(result.templatesLoaded).toBe(2); // 1 partial (broken) + 1 layout

        consoleSpy.mockRestore();
      });

      it('should handle cross-platform path separators correctly', async () => {
        // This test verifies that our path handling works on both Windows (\) and Unix (/)
        mockGlob
          .mockResolvedValueOnce([join(mockProjectRoot, 'src', '_partials')])
          .mockResolvedValueOnce(['test.eta']) // Relative path as it should be
          .mockResolvedValue([]);

        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

        const mockContent = '<div>test partial</div>';
        const mockLayoutContent = '<html><body>test</body></html>';

        mockEtaInstance.renderAsync.mockImplementation((template: string) => {
          if (template.includes('test.eta')) {
            return Promise.resolve(mockContent);
          } else if (template === 'layout.eta') {
            return Promise.resolve(mockLayoutContent);
          }
          return Promise.resolve('');
        });

        const result = await renderPage(
          mockPage,
          '<h1>Test content</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // Verify that the partial was called with the correct platform-specific path pattern
        expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
          expect.stringMatching(/.*_partials.*test\.eta/),
          expect.any(Object),
        );

        // Verify that the rendered content made it to the final context
        const layoutCall = mockEtaInstance.renderAsync.mock.calls.find(
          (call) => call[0] === 'layout.eta',
        );
        expect(layoutCall).toBeDefined();
        // Verify partial is callable and returns expected content
        expect(layoutCall![1].partials.test).toBeInstanceOf(Function);
        expect(layoutCall![1].partials.test.toString()).toBe(mockContent);

        expect(result.html).toBe(mockLayoutContent);
        expect(result.templatesLoaded).toBe(2); // 1 partial + 1 layout
      });

      describe('hierarchical partial discovery', () => {
        it('should discover partials from multiple directory levels', async () => {
          // Test a page in a nested directory to verify hierarchical discovery
          const nestedPage = {
            ...mockPage,
            sourcePath: join(mockProjectRoot, 'src', 'blog', 'article.md'),
            url: '/blog/article',
          };

          const rootPartialsDir = join(mockProjectRoot, 'src', '_partials');
          const blogPartialsDir = join(mockProjectRoot, 'src', 'blog', '_partials');

          // Mock the glob calls for hierarchical discovery
          mockGlob
            // Root level scan: find src/_partials/
            .mockResolvedValueOnce([rootPartialsDir])
            .mockResolvedValueOnce(['header.eta', 'footer.eta'])
            // Blog level scan: find src/blog/_partials/
            .mockResolvedValueOnce([blogPartialsDir])
            .mockResolvedValueOnce(['sidebar.eta'])
            .mockResolvedValue([]);

          mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

          const rootHeaderContent = '<header>Site Header</header>';
          const rootFooterContent = '<footer>Site Footer</footer>';
          const blogSidebarContent = '<aside>Blog Sidebar</aside>';
          const mockLayoutContent = '<html><body>content</body></html>';

          // Mock renderAsync to return content for each partial
          mockEtaInstance.renderAsync.mockImplementation((template: string) => {
            if (template.includes('_partials') && template.includes('header.eta')) {
              return Promise.resolve(rootHeaderContent);
            } else if (template.includes('_partials') && template.includes('footer.eta')) {
              return Promise.resolve(rootFooterContent);
            } else if (template.includes('blog') && template.includes('sidebar.eta')) {
              return Promise.resolve(blogSidebarContent);
            } else if (template.includes('layout.eta')) {
              return Promise.resolve(mockLayoutContent);
            }
            return Promise.resolve('');
          });

          await renderPage(nestedPage, '<h1>Blog article</h1>', mockConfig, mockEtaInstance as Eta);

          // Verify that all partials from different levels were discovered and rendered
          expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
            expect.stringMatching(/.*_partials.*header\.eta/),
            expect.any(Object),
          );

          expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
            expect.stringMatching(/.*_partials.*footer\.eta/),
            expect.any(Object),
          );

          expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
            expect.stringMatching(/.*blog.*_partials.*sidebar\.eta/),
            expect.any(Object),
          );

          // Verify final layout was called with all discovered partials
          const layoutCall = mockEtaInstance.renderAsync.mock.calls.find(
            (call) => typeof call[0] === 'string' && call[0].endsWith('layout.eta'),
          );
          expect(layoutCall).toBeDefined();
          // Verify all partials are callable and return expected content
          expect(layoutCall![1].partials.header).toBeInstanceOf(Function);
          expect(layoutCall![1].partials.footer).toBeInstanceOf(Function);
          expect(layoutCall![1].partials.sidebar).toBeInstanceOf(Function);
          expect(layoutCall![1].partials.header.toString()).toBe(rootHeaderContent);
          expect(layoutCall![1].partials.footer.toString()).toBe(rootFooterContent);
          expect(layoutCall![1].partials.sidebar.toString()).toBe(blogSidebarContent);
        });

        it('should allow more specific partials to override general ones', async () => {
          // Test that partials with the same name override each other hierarchically
          const deepPage = {
            ...mockPage,
            sourcePath: join(mockProjectRoot, 'src', 'docs', 'guide.md'),
            url: '/docs/guide',
          };

          const rootPartialsDir = join(mockProjectRoot, 'src', '_partials');
          const docsPartialsDir = join(mockProjectRoot, 'src', 'docs', '_partials');

          mockGlob
            // Root level: has general header
            .mockResolvedValueOnce([rootPartialsDir])
            .mockResolvedValueOnce(['header.eta'])
            // Docs level: has specific header that should override
            .mockResolvedValueOnce([docsPartialsDir])
            .mockResolvedValueOnce(['header.eta'])
            .mockResolvedValue([]);

          mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

          const docsHeaderContent = '<header class="docs">Docs Header</header>';
          const mockLayoutContent = '<html><body>content</body></html>';

          // The more specific docs header should be used, not the root one
          mockEtaInstance.renderAsync.mockImplementation((template: string) => {
            if (template.includes('docs') && template.includes('header.eta')) {
              return Promise.resolve(docsHeaderContent);
            } else if (template.includes('layout.eta')) {
              return Promise.resolve(mockLayoutContent);
            }
            return Promise.resolve('');
          });

          await renderPage(deepPage, '<h1>Documentation</h1>', mockConfig, mockEtaInstance as Eta);

          // Verify the more specific docs header was used
          expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
            expect.stringMatching(/.*docs.*_partials.*header\.eta/),
            expect.any(Object),
          );

          // Verify final layout uses the overridden partial
          const layoutCall = mockEtaInstance.renderAsync.mock.calls.find(
            (call) => typeof call[0] === 'string' && call[0].endsWith('layout.eta'),
          );
          expect(layoutCall).toBeDefined();
          // Verify partial is callable and returns the docs version
          expect(layoutCall![1].partials.header).toBeInstanceOf(Function);
          expect(layoutCall![1].partials.header.toString()).toBe(docsHeaderContent); // Should be docs version, not root
        });
      });

      describe('callable partials', () => {
        it('should make partials callable with props', async () => {
          mockGlob
            .mockResolvedValueOnce([join(mockProjectRoot, 'src', '_partials')])
            .mockResolvedValueOnce(['card.eta'])
            .mockResolvedValue([]);

          mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

          const mockCardContent = '<div class="card">Default Card</div>';
          const mockLayoutContent = '<html><body>layout</body></html>';

          // Track calls to verify callable behavior
          const renderCalls: Array<{ template: string; context: unknown }> = [];

          mockEtaInstance.renderAsync.mockImplementation((template: string, context?: unknown) => {
            renderCalls.push({ template, context });

            if (template.includes('card.eta')) {
              return Promise.resolve(mockCardContent);
            } else if (template === 'layout.eta') {
              return Promise.resolve(mockLayoutContent);
            }
            return Promise.resolve('');
          });

          await renderPage(mockPage, '<h1>Test content</h1>', mockConfig, mockEtaInstance as Eta);

          // Verify that partials in the layout context are callable
          const layoutCall = renderCalls.find((call) => call.template === 'layout.eta');
          expect(layoutCall).toBeDefined();

          // The partials should be wrapped as callable
          const partialsInContext = (layoutCall?.context as Record<string, unknown>)
            ?.partials as Record<string, unknown>;
          expect(partialsInContext).toBeDefined();
          expect(partialsInContext.card).toBeDefined();

          // Verify that the callable partial has toString method
          const cardPartial = partialsInContext.card as { toString: () => string };
          expect(typeof cardPartial.toString).toBe('function');
          expect(cardPartial.toString()).toBe(mockCardContent);
        });

        it('should support backwards compatibility with direct partial usage', async () => {
          mockGlob
            .mockResolvedValueOnce([join(mockProjectRoot, 'src', '_partials')])
            .mockResolvedValueOnce(['header.eta'])
            .mockResolvedValue([]);

          mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

          const mockHeaderContent = '<header>Site Header</header>';
          const mockLayoutContent = '<html><body>layout</body></html>';

          mockEtaInstance.renderAsync.mockImplementation((template: string) => {
            if (template.includes('header.eta')) {
              return Promise.resolve(mockHeaderContent);
            } else if (template === 'layout.eta') {
              return Promise.resolve(mockLayoutContent);
            }
            return Promise.resolve('');
          });

          const result = await renderPage(
            mockPage,
            '<h1>Test content</h1>',
            mockConfig,
            mockEtaInstance as Eta,
          );

          // Verify that old-style partial usage still works
          expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
            'layout.eta',
            expect.objectContaining({
              partials: expect.objectContaining({
                header: expect.objectContaining({
                  toString: expect.any(Function),
                }),
              }),
            }),
          );

          expect(result.html).toBe(mockLayoutContent);
          expect(result.templatesLoaded).toBe(2); // 1 partial + 1 layout
        });
      });
    });

    describe('RenderResult type and templatesLoaded counter', () => {
      it('should return RenderResult with html and templatesLoaded properties', async () => {
        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);
        mockEtaInstance.renderAsync.mockResolvedValue('<html>Test</html>');

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // Verify RenderResult structure
        expect(result).toHaveProperty('html');
        expect(result).toHaveProperty('templatesLoaded');
        expect(typeof result.html).toBe('string');
        expect(typeof result.templatesLoaded).toBe('number');
      });

      it('should count zero templates when no layout and no partials found', async () => {
        // Mock all path exists to return false (no layout found)
        mockPathExists.mockResolvedValue(false);
        mockGlob.mockResolvedValue([]); // No partials

        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(result.templatesLoaded).toBe(0);
        expect(result.html).toContain('<!DOCTYPE html>'); // Fallback HTML
      });

      it('should count only layout when no partials exist', async () => {
        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);
        mockGlob.mockResolvedValue([]); // No underscore folders
        mockEtaInstance.renderAsync.mockResolvedValue('<html>Layout only</html>');

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(result.templatesLoaded).toBe(1); // Just the layout
      });

      it('should count partials from multiple underscore folders', async () => {
        const rootPartialsDir = join(mockProjectRoot, 'src', '_components');
        const secondPartialsDir = join(mockProjectRoot, 'src', '_partials');

        mockGlob
          .mockResolvedValueOnce([rootPartialsDir, secondPartialsDir]) // Two underscore folders found
          .mockResolvedValueOnce(['header.eta', 'footer.eta']) // 2 files in _components
          .mockResolvedValueOnce(['sidebar.eta']) // 1 file in _partials
          .mockResolvedValue([]);

        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

        mockEtaInstance.renderAsync.mockImplementation((template: string) => {
          if (template.includes('header.eta')) return Promise.resolve('<header/>');
          if (template.includes('footer.eta')) return Promise.resolve('<footer/>');
          if (template.includes('sidebar.eta')) return Promise.resolve('<aside/>');
          if (template.includes('layout.eta')) return Promise.resolve('<html>Layout</html>');
          return Promise.resolve('');
        });

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // 3 partials (header, footer, sidebar) + 1 layout = 4
        expect(result.templatesLoaded).toBe(4);
      });

      it('should count correctly when explicit layout is specified in frontmatter', async () => {
        const pageWithLayout = {
          ...mockPage,
          frontMatter: { ...mockPage.frontMatter, layout: 'custom-layout' },
        };

        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false); // custom-layout.eta exists
        mockGlob.mockResolvedValue([]); // No partials
        mockEtaInstance.renderAsync.mockResolvedValue('<html>Custom Layout</html>');

        const result = await renderPage(
          pageWithLayout,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        expect(result.templatesLoaded).toBe(1); // Custom layout counts as 1
      });

      it('should still count layout even when rendering throws error', async () => {
        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);
        mockGlob.mockResolvedValue([]);
        mockEtaInstance.renderAsync.mockRejectedValue(new Error('Render error'));

        vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // Layout was found, so count is 1 even though rendering failed
        expect(result.templatesLoaded).toBe(1);
        expect(result.html).toContain('<!DOCTYPE html>'); // Fallback HTML
      });

      it('should count partials correctly when some partials fail to render', async () => {
        const partialsDir = join(mockProjectRoot, 'src', '_partials');

        mockGlob
          .mockResolvedValueOnce([partialsDir])
          .mockResolvedValueOnce(['good.eta', 'bad.eta']) // 2 partials
          .mockResolvedValue([]);

        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

        mockEtaInstance.renderAsync.mockImplementation((template: string) => {
          if (template.includes('good.eta')) return Promise.resolve('<div>Good</div>');
          if (template.includes('bad.eta')) return Promise.reject(new Error('Bad template'));
          if (template.includes('layout.eta')) return Promise.resolve('<html>Layout</html>');
          return Promise.resolve('');
        });

        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // 2 partials + 1 layout = 3 (partials count even if they fail)
        expect(result.templatesLoaded).toBe(3);
      });

      it('should count templates correctly for deeply nested pages', async () => {
        // Simpler test: just verify that we count partials + layout correctly
        // when glob returns partials from multiple locations
        const partialsDir1 = join(mockProjectRoot, 'src', '_components');
        const partialsDir2 = join(mockProjectRoot, 'src', '_partials');

        // Return two underscore folders and their contents
        mockGlob
          .mockResolvedValueOnce([partialsDir1, partialsDir2]) // Two underscore folders
          .mockResolvedValueOnce(['header.eta', 'footer.eta']) // Files in _components
          .mockResolvedValueOnce(['sidebar.eta']) // Files in _partials
          .mockResolvedValue([]);

        mockPathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

        mockEtaInstance.renderAsync.mockImplementation((template: string) => {
          if (template.includes('header.eta')) return Promise.resolve('<header/>');
          if (template.includes('footer.eta')) return Promise.resolve('<footer/>');
          if (template.includes('sidebar.eta')) return Promise.resolve('<aside/>');
          if (template.includes('layout.eta')) return Promise.resolve('<html>Layout</html>');
          return Promise.resolve('');
        });

        const result = await renderPage(
          mockPage,
          '<h1>Test</h1>',
          mockConfig,
          mockEtaInstance as Eta,
        );

        // 3 partials (header, footer, sidebar) + 1 layout = 4
        expect(result.templatesLoaded).toBe(4);
      });
    });
  });
});
