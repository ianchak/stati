import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMarkdownProcessor, renderMarkdown } from '../../src/core/markdown.js';
import type { StatiConfig } from '../../src/types/index.js';

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

      expect(result.html).toContain('<h1>Hello World</h1>');
      expect(result.html).toContain('<p>This is a paragraph.</p>');
    });

    it('should render markdown with links', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '[GitHub](https://github.com)';

      const result = renderMarkdown(content, md);

      expect(result.html).toContain('<a href="https://github.com">GitHub</a>');
    });

    it('should render markdown with HTML when html option is enabled', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '# Title\n\n<div class="custom">Custom HTML</div>';

      const result = renderMarkdown(content, md);

      expect(result.html).toContain('<h1>Title</h1>');
      expect(result.html).toContain('<div class="custom">Custom HTML</div>');
    });

    it('should apply typographer transformations', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = 'Hello "world" -- this is a test...';

      const result = renderMarkdown(content, md);

      // Typographer should convert quotes and dashes - check for actual transformations
      expect(result.html).not.toContain('"world"'); // Should not contain straight quotes
      expect(result.html).toContain('world'); // Should still contain the word
      expect(result.html).toContain('–'); // En dash from --
      expect(result.html).toContain('…'); // Ellipsis from ...

      // Ensure original content was transformed
      expect(result.html).not.toContain('--'); // Double dash should be converted
      expect(result.html).not.toContain('...'); // Triple dot should be converted
    });

    it('should linkify URLs when linkify is enabled', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = 'Visit https://example.com for more info.';

      const result = renderMarkdown(content, md);

      expect(result.html).toContain('<a href="https://example.com">https://example.com</a>');
    });

    it('should handle empty content', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '';

      const result = renderMarkdown(content, md);

      expect(result.html).toBe('');
    });

    it('should handle content with only whitespace', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '   \n\n  \t  \n';

      const result = renderMarkdown(content, md);

      expect(result.html.trim()).toBe('');
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

      expect(result.html).toContain('<h1>Main Title</h1>');
      expect(result.html).toContain('<h2 id="subtitle">Subtitle</h2>');
      expect(result.html).toContain('<strong>bold</strong>');
      expect(result.html).toContain('<em>italic</em>');
      expect(result.html).toContain('<ul>');
      expect(result.html).toContain('<li>List item 1</li>');
      expect(result.html).toContain('<pre><code class="language-javascript">');
      expect(result.html).toContain('<blockquote>');
    });
  });

  describe('TOC extraction', () => {
    it('should extract TOC entries from headings', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `# Page Title

## Introduction

Some text.

## Getting Started

More content.

### Installation

Install instructions.

## Conclusion`;

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(4);
      expect(result.toc[0]).toEqual({ id: 'introduction', text: 'Introduction', level: 2 });
      expect(result.toc[1]).toEqual({ id: 'getting-started', text: 'Getting Started', level: 2 });
      expect(result.toc[2]).toEqual({ id: 'installation', text: 'Installation', level: 3 });
      expect(result.toc[3]).toEqual({ id: 'conclusion', text: 'Conclusion', level: 2 });
    });

    it('should not include h1 in TOC', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `# Main Title

## Section One

### Subsection`;

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(2);
      expect(result.toc[0]!.text).toBe('Section One');
      expect(result.toc[1]!.text).toBe('Subsection');
    });

    it('should handle duplicate heading IDs', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## Intro

Some text.

## Intro

More text.

## Intro`;

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(3);
      expect(result.toc[0]).toEqual({ id: 'intro', text: 'Intro', level: 2 });
      expect(result.toc[1]).toEqual({ id: 'intro-1', text: 'Intro', level: 2 });
      expect(result.toc[2]).toEqual({ id: 'intro-2', text: 'Intro', level: 2 });
    });

    it('should inject anchor IDs into heading HTML', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## Getting Started

## Installation`;

      const result = renderMarkdown(content, md);

      expect(result.html).toContain('<h2 id="getting-started">Getting Started</h2>');
      expect(result.html).toContain('<h2 id="installation">Installation</h2>');
    });

    it('should return empty TOC when tocEnabled is false', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## Section One

## Section Two`;

      const result = renderMarkdown(content, md, false);

      expect(result.toc).toEqual([]);
      expect(result.html).not.toContain('id="section-one"');
      expect(result.html).not.toContain('id="section-two"');
    });

    it('should return MarkdownResult structure', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Test';

      const result = renderMarkdown(content, md);

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('toc');
      expect(typeof result.html).toBe('string');
      expect(Array.isArray(result.toc)).toBe(true);
    });

    it('should handle headings with special characters', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## What's New?

## Getting Started!

## API: Configuration`;

      const result = renderMarkdown(content, md);

      expect(result.toc[0]!.id).toBe('what-s-new');
      expect(result.toc[1]!.id).toBe('getting-started');
      expect(result.toc[2]!.id).toBe('api-configuration');
    });

    it('should handle empty headings', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `##

## Valid Heading`;

      const result = renderMarkdown(content, md);

      // Empty heading might still be processed but with empty text
      expect(result.toc.find((t) => t.text === 'Valid Heading')).toBeDefined();
    });

    it('should handle all heading levels 2-6', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## Level 2

### Level 3

#### Level 4

##### Level 5

###### Level 6`;

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(5);
      expect(result.toc[0]!.level).toBe(2);
      expect(result.toc[1]!.level).toBe(3);
      expect(result.toc[2]!.level).toBe(4);
      expect(result.toc[3]!.level).toBe(5);
      expect(result.toc[4]!.level).toBe(6);
    });

    it('should handle headings with inline code', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Using `console.log`';

      const result = renderMarkdown(content, md);

      // The text extraction includes both regular text and code_inline tokens
      expect(result.toc[0]!.text).toBe('Using console.log');
      expect(result.toc[0]!.id).toBe('using-console-log');
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

  describe('TOC edge cases', () => {
    it('should handle headings with only bold text', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## **Bold Heading**';

      const result = renderMarkdown(content, md);

      // Bold text is wrapped in strong, text extraction should still work
      expect(result.toc).toHaveLength(1);
      expect(result.toc[0]!.text).toBe('Bold Heading');
    });

    it('should handle headings with only italic text', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## *Italic Heading*';

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(1);
      expect(result.toc[0]!.text).toBe('Italic Heading');
    });

    it('should handle headings with mixed formatting', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Hello **bold** and *italic* world';

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(1);
      // Only text and code_inline tokens are extracted
      expect(result.toc[0]!.text).toBe('Hello bold and italic world');
    });

    it('should handle headings with links', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Visit [our site](https://example.com)';

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(1);
      // Link text should be included
      expect(result.toc[0]!.text).toBe('Visit our site');
    });

    it('should handle content with no headings', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = 'Just some paragraph text without any headings.';

      const result = renderMarkdown(content, md);

      expect(result.toc).toEqual([]);
      expect(result.html).toContain('<p>Just some paragraph text');
    });

    it('should handle content with only h1 headings', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `# Title One

# Title Two`;

      const result = renderMarkdown(content, md);

      // h1 headings are not included in TOC
      expect(result.toc).toEqual([]);
    });

    it('should handle heading immediately followed by another heading', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## First
## Second
### Third`;

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(3);
      expect(result.toc[0]!.text).toBe('First');
      expect(result.toc[1]!.text).toBe('Second');
      expect(result.toc[2]!.text).toBe('Third');
    });

    it('should handle heading with numbers at the start', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## 1. Getting Started';

      const result = renderMarkdown(content, md);

      expect(result.toc[0]!.text).toBe('1. Getting Started');
      expect(result.toc[0]!.id).toBe('1-getting-started');
    });

    it('should handle heading with emoji', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## 🚀 Quick Start';

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(1);
      expect(result.toc[0]!.text).toBe('🚀 Quick Start');
    });

    it('should handle very long heading text', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const longText =
        'This is a very long heading that contains many words and might be truncated in some displays but should still work correctly';
      const content = `## ${longText}`;

      const result = renderMarkdown(content, md);

      expect(result.toc[0]!.text).toBe(longText);
      expect(result.toc[0]!.id).toBe(
        'this-is-a-very-long-heading-that-contains-many-words-and-might-be-truncated-in-some-displays-but-should-still-work-correctly',
      );
    });

    it('should handle heading with only code', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## `config.js`';

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(1);
      expect(result.toc[0]!.text).toBe('config.js');
      expect(result.toc[0]!.id).toBe('config-js');
    });

    it('should maintain TOC order matching document order', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = `## First Section

Some content.

### Nested Under First

#### Deeply Nested

## Second Section

### Nested Under Second`;

      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(5);
      expect(result.toc.map((t) => t.text)).toEqual([
        'First Section',
        'Nested Under First',
        'Deeply Nested',
        'Second Section',
        'Nested Under Second',
      ]);
    });
  });

  describe('markdown.toc config option integration', () => {
    it('should respect tocEnabled parameter when true', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Test Heading';

      const result = renderMarkdown(content, md, true);

      expect(result.toc).toHaveLength(1);
      expect(result.html).toContain('id="test-heading"');
    });

    it('should respect tocEnabled parameter when false', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Test Heading';

      const result = renderMarkdown(content, md, false);

      expect(result.toc).toEqual([]);
      expect(result.html).not.toContain('id=');
    });

    it('should default tocEnabled to true', async () => {
      const md = await createMarkdownProcessor(baseConfig);
      const content = '## Default Behavior';

      // Call without the third parameter
      const result = renderMarkdown(content, md);

      expect(result.toc).toHaveLength(1);
      expect(result.html).toContain('id="default-behavior"');
    });
  });
});
