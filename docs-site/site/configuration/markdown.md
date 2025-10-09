---
title: 'Markdown Config'
description: 'Configure markdown-it and customize markdown rendering behavior.'
order: 4
---

# Markdown Configuration

Stati uses [markdown-it](https://github.com/markdown-it/markdown-it) as its markdown processor, providing extensive customization options for content processing, syntax highlighting, and plugin integration.

## Basic Markdown Configuration

Configure markdown processing in your `stati.config.js`:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Enable HTML tags in markdown
    html: true,

    // Automatically convert links
    linkify: true,

    // Enable typographic replacements
    typographer: true,

    // Quote and dash replacements
    quotes: '""''',

    // Line breaks behavior
    breaks: false,

    // Enable language detection for code blocks
    langPrefix: 'language-',

    // Highlight.js configuration
    highlight: {
      enabled: true,
      theme: 'github',
      lineNumbers: true
    }
  }
});
```

## Core Parser Options

### HTML and Safety

```javascript
export default defineConfig({
  markdown: {
    // Allow HTML tags in markdown
    html: true,

    // Automatically convert URLs to links
    linkify: true,

    // Link validation and security
    linkValidation: {
      // Validate external links
      validateExternal: true,

      // Allowed protocols
      allowedProtocols: ['http', 'https', 'mailto', 'tel'],

      // Add security attributes to external links
      externalLinkAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    },
  },
});
```

### Typography

```javascript
export default defineConfig({
  markdown: {
    // Enable smart quotes and dashes
    typographer: true,

    // Custom quote characters
    quotes: '""''', // English quotes
    // quotes: '«»„"', // German quotes
    // quotes: '「」「」', // Japanese quotes

    // Typography replacements
    replacements: {
      // Em dash
      '---': '—',

      // En dash
      '--': '–',

      // Ellipsis
      '...': '…',

      // Copyright
      '(c)': '©',

      // Trademark
      '(tm)': '™',

      // Registered trademark
      '(r)': '®'
    }
  }
});
```

### Line Breaks and Formatting

```javascript
export default defineConfig({
  markdown: {
    // Convert line breaks to <br>
    breaks: false,

    // Tab size for code blocks
    tabSize: 2,

    // Normalize whitespace
    normalize: true,

    // Table formatting
    tables: {
      enabled: true,

      // Add CSS classes to tables
      className: 'table table-striped',

      // Table alignment
      align: true,
    },
  },
});
```

## Syntax Highlighting

### Highlight.js Configuration

```javascript
export default defineConfig({
  markdown: {
    highlight: {
      // Enable syntax highlighting
      enabled: true,

      // Highlight.js theme
      theme: 'github', // 'github', 'monokai', 'solarized-dark', etc.

      // Additional themes for dark mode
      themes: {
        light: 'github',
        dark: 'github-dark',
      },

      // Show line numbers
      lineNumbers: true,

      // Copy button
      copyButton: true,

      // Language detection
      autoDetect: true,

      // Supported languages
      languages: [
        'javascript',
        'typescript',
        'python',
        'java',
        'cpp',
        'html',
        'css',
        'scss',
        'json',
        'yaml',
        'markdown',
        'bash',
        'shell',
        'sql',
        'php',
        'ruby',
        'go',
        'rust',
      ],

      // Custom language aliases
      aliases: {
        js: 'javascript',
        ts: 'typescript',
        py: 'python',
        sh: 'shell',
      },
    },
  },
});
```

### Prism.js Configuration

Alternative syntax highlighter:

```javascript
export default defineConfig({
  markdown: {
    highlight: {
      engine: 'prism', // Use Prism instead of Highlight.js

      theme: 'prism-tomorrow',

      // Prism plugins
      plugins: ['line-numbers', 'copy-to-clipboard', 'show-language', 'toolbar'],

      // Custom Prism configuration
      prismConfig: {
        languages: ['javascript', 'css', 'markup'],
        showLineNumbers: true,
        normalizeWhitespace: true,
      },
    },
  },
});
```

## Markdown Extensions

### Common Extensions

```javascript
export default defineConfig({
  markdown: {
    extensions: {
      // GitHub Flavored Markdown
      gfm: {
        enabled: true,

        // Strikethrough text
        strikethrough: true,

        // Task lists
        taskLists: true,

        // Tables
        tables: true,

        // Automatic link detection
        linkify: true,
      },

      // Footnotes
      footnotes: {
        enabled: true,

        // Footnote anchor text
        anchorText: '↩',

        // Footnote prefix
        prefix: 'fn',

        // Back reference prefix
        backrefPrefix: 'fnref',
      },

      // Abbreviations
      abbreviations: {
        enabled: true,

        // Global abbreviations
        definitions: {
          HTML: 'HyperText Markup Language',
          CSS: 'Cascading Style Sheets',
          JS: 'JavaScript',
        },
      },

      // Definition lists
      definitionLists: true,

      // Math expressions
      math: {
        enabled: true,
        engine: 'katex', // 'katex' or 'mathjax'

        // Inline math delimiters
        inlineDelimiters: [
          ['$', '$'],
          ['\\(', '\\)'],
        ],

        // Block math delimiters
        blockDelimiters: [
          ['$$', '$$'],
          ['\\[', '\\]'],
        ],
      },
    },
  },
});
```

### Markdown-it Plugin Support

Stati supports markdown-it plugins for extending markdown processing capabilities:

```javascript
export default defineConfig({
  markdown: {
    // Array of plugins to load - each can be a string or [name, options]
    plugins: [
      // Simple plugin name (will load markdown-it-{name})
      'anchor',
      'toc-done-right',

      // Plugin with options
      ['container', {
        name: 'warning',
        render: (tokens, idx) => {
          // Custom rendering logic
        }
      }],

      'emoji',
      'footnote'
    ],

    // Alternative: configure manually with setup function
    configure: (md) => {
      // Import and use plugins directly
      md.use(require('markdown-it-anchor'), {
        permalink: true,
        permalinkBefore: true
      });

      md.use(require('markdown-it-toc-done-right'), {
        includeLevel: [1, 2, 3]
      });
    }
  }
});
```

**Available Plugin Formats:**

- `'plugin-name'` - Loads `markdown-it-plugin-name` with default options
- `['plugin-name', options]` - Loads plugin with custom options
- Use `configure` function for complex plugin setups

**Popular markdown-it Plugins:**

- `markdown-it-anchor` - Heading anchors
- `markdown-it-toc-done-right` - Table of contents
- `markdown-it-container` - Custom containers
- `markdown-it-emoji` - Emoji support
- `markdown-it-footnote` - Footnotes

## Content Processing

### Front Matter Processing

```javascript
export default defineConfig({
  markdown: {
    frontMatter: {
      // Front matter delimiter
      delimiter: '---',

      // Allowed formats
      formats: ['yaml', 'json', 'toml'],

      // Default values
      defaults: {
        draft: false,
        publishedAt: () => new Date().toISOString(),
        author: 'Default Author',
      },

      // Validation rules
      validation: {
        title: 'required|string',
        description: 'string|max:160',
        tags: 'array',
        publishedAt: 'date',
      },
    },
  },
});
```

### Content Transformation

```javascript
export default defineConfig({
  markdown: {
    transforms: [
      // Auto-generate table of contents
      {
        name: 'toc',
        transform: (content, page) => {
          const toc = generateTableOfContents(content);
          page.toc = toc;
          return content;
        },
      },

      // Extract reading time
      {
        name: 'reading-time',
        transform: (content, page) => {
          const wordsPerMinute = 200;
          const words = content.replace(/\s+/g, ' ').split(' ').length;
          page.readingTime = Math.ceil(words / wordsPerMinute);
          return content;
        },
      },

      // Process custom shortcodes
      {
        name: 'shortcodes',
        transform: (content) => {
          return content.replace(
            /\{\{< youtube ([^>]+) >\}\}/g,
            '<div class="youtube-embed"><iframe src="https://www.youtube.com/embed/$1"></iframe></div>',
          );
        },
      },

      // Image optimization
      {
        name: 'images',
        transform: (content) => {
          return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            // Add loading="lazy" and optimize image paths
            return `<img src="${src}" alt="${alt}" loading="lazy" class="responsive-image">`;
          });
        },
      },
    ],
  },
});
```

## Advanced Features

### Code Block Enhancements

````javascript
export default defineConfig({
  markdown: {
    codeBlocks: {
      // Filename display
      showFilename: true,

      // Language badges
      showLanguage: true,

      // Copy button
      copyButton: {
        enabled: true,
        text: 'Copy',
        successText: 'Copied!',
      },

      // Line highlighting
      lineHighlight: {
        enabled: true,

        // Syntax: ```js {1,3-5}
        marker: /\{([^}]+)\}/,
      },

      // Diff highlighting
      diff: {
        enabled: true,

        // + for additions, - for deletions
        markers: {
          addition: '+',
          deletion: '-',
        },
      },
    },
  },
});
````

### Link Processing

```javascript
export default defineConfig({
  markdown: {
    links: {
      // Internal link processing
      internal: {
        // Convert .md links to .html
        convertExtensions: true,

        // Validate internal links exist
        validate: true,

        // Base path for internal links
        basePath: '/',
      },

      // External link processing
      external: {
        // Add target="_blank"
        openInNewTab: true,

        // Add rel="noopener noreferrer"
        addSecurity: true,

        // Add external link icon
        addIcon: true,

        // Custom attributes
        attributes: {
          class: 'external-link',
        },
      },
    },
  },
});
```

### Image Processing

```javascript
export default defineConfig({
  markdown: {
    images: {
      // Lazy loading
      lazyLoading: true,

      // Responsive images
      responsive: {
        enabled: true,

        // Generate multiple sizes
        sizes: [400, 800, 1200],

        // Image formats
        formats: ['webp', 'avif', 'jpeg'],
      },

      // Image optimization
      optimization: {
        enabled: true,

        // Quality settings
        quality: 80,

        // Compression
        compression: 'lossy',
      },

      // Figure generation
      figures: {
        enabled: true,

        // Generate <figure> tags
        wrap: true,

        // Caption from alt text
        captionFromAlt: true,
      },
    },
  },
});
```

## Performance Optimization

### Caching

```javascript
export default defineConfig({
  markdown: {
    cache: {
      // Enable markdown parsing cache
      enabled: true,

      // Cache directory
      directory: '.stati/markdown-cache',

      // Cache strategy
      strategy: 'content-hash', // 'content-hash' | 'mtime'

      // Cache TTL
      ttl: 1000 * 60 * 60 * 24, // 24 hours

      // Max cache size
      maxSize: 100 * 1024 * 1024, // 100MB
    },
  },
});
```

### Processing Optimization

```javascript
export default defineConfig({
  markdown: {
    performance: {
      // Parallel processing
      parallel: {
        enabled: true,
        maxWorkers: require('os').cpus().length,
      },

      // Streaming for large files
      streaming: {
        enabled: true,
        chunkSize: 64 * 1024, // 64KB chunks
      },

      // Memory optimization
      memory: {
        // Clear parser cache after processing
        clearCache: true,

        // Garbage collection hints
        gc: true,
      },
    },
  },
});
```

## Testing and Validation

### Content Validation

```javascript
export default defineConfig({
  markdown: {
    validation: {
      // Validate markdown syntax
      syntax: true,

      // Check for broken links
      links: {
        internal: true,
        external: false, // Can be slow
      },

      // Validate front matter
      frontMatter: true,

      // Check for accessibility issues
      accessibility: {
        headingStructure: true,
        altText: true,
        colorContrast: false,
      },
    },
  },
});
```

### Debug Mode

```javascript
export default defineConfig({
  markdown: {
    debug: {
      // Enable debug mode in development
      enabled: process.env.NODE_ENV === 'development',

      // Show processing time
      timing: true,

      // Log parser warnings
      warnings: true,

      // Output debug information
      verbose: false,
    },
  },
});
```

## Best Practices

### Content Organization

1. **Consistent Front Matter**: Use consistent field names across all content
2. **Semantic Headings**: Use proper heading hierarchy (h1 → h2 → h3)
3. **Alt Text**: Always provide descriptive alt text for images
4. **Link Context**: Provide meaningful link text and context

### Performance

1. **Image Optimization**: Use optimized images with appropriate formats
2. **Lazy Loading**: Enable lazy loading for images and heavy content
3. **Caching**: Enable markdown processing cache in production
4. **Code Splitting**: Split large markdown files into smaller chunks

### SEO and Accessibility

1. **Meta Descriptions**: Include descriptions in front matter
2. **Heading Structure**: Maintain logical heading hierarchy
3. **Link Accessibility**: Use descriptive link text
4. **Language**: Specify content language in front matter

Markdown configuration is essential for creating rich, accessible, and performant content. Take advantage of Stati's extensive markdown processing capabilities to create engaging documentation and blog content.
