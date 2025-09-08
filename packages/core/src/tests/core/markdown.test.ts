import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMarkdownProcessor, renderMarkdown } from '../../core/markdown.js';
import type { StatiConfig } from '../../types.js';

describe('markdown.ts', () => {
  const baseConfig: StatiConfig = {
    srcDir: 'src',
    outDir: 'dist',
    staticDir: 'static',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMarkdownProcessor', () => {
    it('should create MarkdownIt processor with default options', async () => {
      const md = await createMarkdownProcessor(baseConfig);

      expect(md).toBeDefined();
      expect(md.options.html).toBe(true);
      expect(md.options.linkify).toBe(true);
      expect(md.options.typographer).toBe(true);
    });

    it('should apply user configuration when provided', async () => {
      const configureFn = vi.fn();
      const configWithMarkdown: StatiConfig = {
        ...baseConfig,
        markdown: {
          configure: configureFn,
        },
      };

      const md = await createMarkdownProcessor(configWithMarkdown);

      expect(configureFn).toHaveBeenCalledWith(md);
    });

    it('should work without markdown configuration', async () => {
      const config: StatiConfig = {
        ...baseConfig,
      };

      const md = await createMarkdownProcessor(config);

      expect(md).toBeDefined();
      expect(md.options.html).toBe(true);
    });

    it('should work with empty markdown configuration', async () => {
      const config: StatiConfig = {
        ...baseConfig,
        markdown: {},
      };

      const md = await createMarkdownProcessor(config);

      expect(md).toBeDefined();
      expect(md.options.html).toBe(true);
    });

    it('should allow custom configuration to override defaults', async () => {
      const config: StatiConfig = {
        ...baseConfig,
        markdown: {
          configure: (md) => {
            md.set({ html: false, linkify: false });
          },
        },
      };

      const md = await createMarkdownProcessor(config);

      expect(md.options.html).toBe(false);
      expect(md.options.linkify).toBe(false);
      expect(md.options.typographer).toBe(true); // should keep this default
    });
  });

  describe('renderMarkdown', () => {
    it('should render basic markdown to HTML', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '# Hello World\n\nThis is a paragraph.';

      const result = renderMarkdown(content, md);

      expect(result).toContain('<h1>Hello World</h1>');
      expect(result).toContain('<p>This is a paragraph.</p>');
    });

    it('should render markdown with links', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '[GitHub](https://github.com)';

      const result = renderMarkdown(content, md);

      expect(result).toContain('<a href="https://github.com">GitHub</a>');
    });

    it('should render markdown with HTML when html option is enabled', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '# Title\n\n<div class="custom">Custom HTML</div>';

      const result = renderMarkdown(content, md);

      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<div class="custom">Custom HTML</div>');
    });

    it('should apply typographer transformations', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = 'Hello "world" -- this is a test...';

      const result = renderMarkdown(content, md);

      // Typographer should convert quotes and dashes - check for actual transformations
      expect(result).not.toContain('"world"'); // Should not contain straight quotes
      expect(result).toContain('world'); // Should still contain the word
      expect(result).toContain('–'); // En dash from --
      expect(result).toContain('…'); // Ellipsis from ...

      // Ensure original content was transformed
      expect(result).not.toContain('--'); // Double dash should be converted
      expect(result).not.toContain('...'); // Triple dot should be converted
    });

    it('should linkify URLs when linkify is enabled', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = 'Visit https://example.com for more info.';

      const result = renderMarkdown(content, md);

      expect(result).toContain('<a href="https://example.com">https://example.com</a>');
    });

    it('should handle empty content', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '';

      const result = renderMarkdown(content, md);

      expect(result).toBe('');
    });

    it('should handle content with only whitespace', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '   \n\n  \t  \n';

      const result = renderMarkdown(content, md);

      expect(result.trim()).toBe('');
    });

    it('should render complex markdown with multiple elements', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `# Main Title

## Subtitle

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2
  - Nested item

\`\`\`javascript
console.log('code block');
\`\`\`

> This is a blockquote.`;

      const result = renderMarkdown(content, md);

      expect(result).toContain('<h1>Main Title</h1>');
      expect(result).toContain('<h2>Subtitle</h2>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>List item 1</li>');
      expect(result).toContain('<pre><code class="language-javascript">');
      expect(result).toContain('<blockquote>');
    });
  });

  describe('plugin array configuration', () => {
    it('should handle empty plugins array', async () => {
      const config: StatiConfig = {
        ...baseConfig,
        markdown: {
          plugins: [],
        },
      };

      const md = await createMarkdownProcessor(config);

      expect(md).toBeDefined();
      expect(md.options.html).toBe(true);
    });

    it('should warn and continue when plugin fails to load', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config: StatiConfig = {
        ...baseConfig,
        markdown: {
          plugins: ['nonexistent-plugin'],
        },
      };

      const md = await createMarkdownProcessor(config);

      expect(md).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load markdown plugin: markdown-it-nonexistent-plugin'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should apply both plugins array and configure function', async () => {
      const configureFn = vi.fn();
      const config: StatiConfig = {
        ...baseConfig,
        markdown: {
          plugins: [], // Empty array for this test
          configure: configureFn,
        },
      };

      const md = await createMarkdownProcessor(config);

      expect(configureFn).toHaveBeenCalledWith(md);
    });

    it('should handle plugin array with options', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config: StatiConfig = {
        ...baseConfig,
        markdown: {
          plugins: [['nonexistent-plugin', { option: 'value' }]],
        },
      };

      // Should not throw, should warn about missing plugin
      const md = await createMarkdownProcessor(config);

      expect(md).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load markdown plugin: markdown-it-nonexistent-plugin'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle mixed plugin formats in array', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config: StatiConfig = {
        ...baseConfig,
        markdown: {
          plugins: ['nonexistent-plugin-1', ['nonexistent-plugin-2', { option: 'value' }]],
        },
      };

      const md = await createMarkdownProcessor(config);

      expect(md).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });
});
