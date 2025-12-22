---
title: 'Markdown Config'
description: 'Configure markdown-it plugins and customize markdown rendering.'
order: 4
---

# Markdown Configuration

Stati uses [markdown-it](https://github.com/markdown-it/markdown-it) as its markdown processor. The engine is configured with sensible defaults, and you can extend it with plugins or customize rendering behavior.

## Configuration Options

Stati provides two options for markdown customization:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Array of markdown-it plugins
    plugins: [
      'anchor',                    // Plugin name only
      ['prism', { options }],      // Plugin with options
    ],

    // Custom configuration function
    configure: (md) => {
      // Receive markdown-it instance
      // Customize rendering, add plugins, etc.
    },

    // Enable/disable TOC extraction (default: true)
    toc: true,
  },
});
```

### `markdown.toc`

Enable or disable automatic Table of Contents (TOC) extraction and heading anchor generation.

- **Type**: `boolean`
- **Default**: `true`

When enabled, Stati automatically:

1. **Extracts heading data** from markdown content (levels h2-h6)
2. **Generates unique anchor IDs** for each heading (handles duplicates: `intro`, `intro-1`, `intro-2`)
3. **Populates `stati.page.toc`** with heading entries for use in templates

```typescript
export default defineConfig({
  markdown: {
    toc: false, // Disable TOC extraction and anchor generation
  },
});
```

When disabled, `stati.page.toc` will be an empty array and headings will not have `id` attributes injected.

See [Table of Contents (TOC)](#table-of-contents-toc) for template usage examples.

## Default Settings

Stati creates markdown-it with these hardcoded settings (not configurable):

- **HTML enabled**: HTML tags are allowed in markdown source
- **Linkify enabled**: URLs are automatically converted to links
- **Typographer enabled**: Smart quotes and typography replacements

These defaults provide a good balance of functionality and security for most use cases.

## Markdown Plugins

The `plugins` option accepts an array of markdown-it plugins. Stati automatically prepends `markdown-it-` to plugin names.

### Plugin Format

**Simple plugin** (string):

```javascript
export default defineConfig({
  markdown: {
    plugins: ['anchor', 'footnote', 'emoji'],
  },
});
```

**Plugin with options** (array):

```javascript
export default defineConfig({
  markdown: {
    plugins: [
      ['anchor', {
        slugify: (s) => s.toLowerCase().trim().replace(/[\s\W-]+/g, '-'),
      }],
      ['prism', {
        defaultLanguage: 'javascript',
      }],
    ],
  },
});
```

### Plugin Installation

Plugins must be installed as npm dependencies:

```bash
npm install markdown-it-anchor
npm install markdown-it-footnote
npm install @widgetbot/markdown-it-prism
```

### Common Plugins

| Plugin | Package | Purpose |
|--------|---------|---------|
| `anchor` | `markdown-it-anchor` | Add IDs to headings |
| `prism` | `@widgetbot/markdown-it-prism` | Syntax highlighting |
| `toc-done-right` | `markdown-it-toc-done-right` | Table of contents |
| `footnote` | `markdown-it-footnote` | Footnote support |
| `emoji` | `markdown-it-emoji` | Emoji shortcuts :smile: |
| `external-links` | `markdown-it-external-links` | External link attributes |
| `container` | `markdown-it-container` | Custom containers |
| `attrs` | `markdown-it-attrs` | Add attributes to elements |

### Example: Complete Plugin Setup

```javascript
export default defineConfig({
  markdown: {
    plugins: [
      // Add IDs to headings for deep linking
      ['anchor', {
        slugify: (s) => s.toLowerCase().trim().replace(/[\s\W-]+/g, '-'),
        permalink: false,
      }],

      // Generate table of contents
      'toc-done-right',

      // Syntax highlighting with Prism.js
      ['prism', {
        defaultLanguage: 'javascript',
      }],

      // Add target="_blank" to external links
      ['external-links', {
        externalTarget: '_blank',
        internalDomains: ['stati.build'],
      }],

      // Support for ::: container syntax
      ['container', 'warning'],
      ['container', 'tip'],

      // Footnote support
      'footnote',

      // Emoji shortcuts
      'emoji',
    ],
  },
});
```

## Custom Configuration

The `configure` option accepts a function that receives the markdown-it instance. This runs **after** plugins are loaded, allowing you to override plugin behavior.

### Basic Customization

```javascript
export default defineConfig({
  markdown: {
    configure: (md) => {
      // Modify markdown-it options
      md.set({ breaks: true });

      // Configure linkify
      md.linkify.set({ fuzzyEmail: false });

      // Add plugins programmatically
      md.use(somePlugin, options);
    },
  },
});
```

### Custom Renderer Rules

Customize how specific markdown elements are rendered:

```javascript
export default defineConfig({
  markdown: {
    configure: (md) => {
      // Customize heading rendering
      md.renderer.rules.heading_open = (tokens, idx) => {
        const level = tokens[idx].tag;
        const label = tokens[idx + 1].content;
        return `<${level} class="heading heading-${level}" data-label="${label}">`;
      };

      // Customize link rendering
      const defaultLinkOpen = md.renderer.rules.link_open ||
        ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const aIndex = tokens[idx].attrIndex('href');
        if (aIndex >= 0) {
          const href = tokens[idx].attrs[aIndex][1];

          // Add class to external links
          if (href.startsWith('http')) {
            tokens[idx].attrPush(['class', 'external-link']);
            tokens[idx].attrPush(['rel', 'noopener noreferrer']);
          }
        }
        return defaultLinkOpen(tokens, idx, options, env, self);
      };
    },
  },
});
```

### Custom Block Syntax

Create custom container syntax:

```javascript
import container from 'markdown-it-container';

export default defineConfig({
  markdown: {
    plugins: [
      ['container', 'warning'],
      ['container', 'tip'],
      ['container', 'danger'],
    ],
  },
});
```

**Usage in markdown:**

```markdown
::: warning
This is a warning message
:::

::: tip
This is a helpful tip
:::
```

## Syntax Highlighting

Stati doesn't provide built-in syntax highlighting. You have two options:

### Option 1: Client-Side (Recommended)

Use the `markdown-it-prism` plugin with Prism.js:

**Install:**
```bash
npm install @widgetbot/markdown-it-prism prismjs
```

**Configure:**
```javascript
export default defineConfig({
  markdown: {
    plugins: [
      ['prism', { defaultLanguage: 'javascript' }],
    ],
  },
});
```

**Add to layout:**
```html
<link rel="stylesheet" href="/path/to/prism.css">
<script src="/path/to/prism.js"></script>
```

**Pros:** Simple setup, many themes available, works well for static sites
**Cons:** Requires JavaScript, flash of unstyled code before JS loads

### Option 2: Server-Side

Use any server-side highlighter in the `configure` function:

```javascript
import { getHighlighter } from 'shiki';

export default defineConfig({
  markdown: {
    configure: async (md) => {
      const highlighter = await getHighlighter({
        theme: 'nord',
        langs: ['javascript', 'typescript', 'python', 'html', 'css'],
      });

      md.options.highlight = (code, lang) => {
        if (lang && highlighter.getLoadedLanguages().includes(lang)) {
          return highlighter.codeToHtml(code, { lang });
        }
        return ''; // Return empty string for unsupported languages
      };
    },
  },
});
```

**Pros:** No JavaScript required, no flash of unstyled code
**Cons:** More complex setup, increases build time

## Front Matter

Stati automatically parses YAML front matter from markdown files using `gray-matter`. This is not configurable.

**Example:**

```markdown
---
title: My Page Title
description: Page description
date: 2024-01-15
tags: [stati, markdown]
author: John Doe
---

# Your content here
```

All front matter fields are available in templates:

```eta
<h1><%= stati.page.title %></h1>
<p><%= stati.page.description %></p>
<time><%= new Date(stati.page.date).toLocaleDateString() %></time>
```

## Best Practices

### Plugin Selection

1. **Install only what you need** - Each plugin adds processing overhead
2. **Check compatibility** - Ensure plugins work with your markdown-it version
3. **Test thoroughly** - Some plugins may conflict with each other

### Custom Rendering

1. **Use configure for overrides** - The configure function runs after plugins
2. **Preserve defaults** - Store default renderer before overriding
3. **Handle edge cases** - Check for null/undefined values in custom rules

### Performance

1. **Limit plugins** - Too many plugins slow down builds
2. **Cache compiled results** - Stati caches in production automatically
3. **Optimize images** - Large images slow down markdown parsing

## Complete Example

A production-ready markdown configuration:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    plugins: [
      // Heading anchors
      ['anchor', {
        slugify: (s) => s.toLowerCase().trim().replace(/[\s\W-]+/g, '-'),
      }],

      // Table of contents
      'toc-done-right',

      // Syntax highlighting
      ['prism', { defaultLanguage: 'javascript' }],

      // External links
      ['external-links', {
        externalTarget: '_blank',
        internalDomains: ['stati.build'],
      }],

      // Custom containers
      ['container', 'warning'],
      ['container', 'tip'],

      // Footnotes
      'footnote',
    ],

    configure: (md) => {
      // Add custom CSS classes to links
      const defaultLinkOpen = md.renderer.rules.link_open ||
        ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const aIndex = tokens[idx].attrIndex('href');
        if (aIndex >= 0) {
          const href = tokens[idx].attrs[aIndex][1];
          if (href.startsWith('http')) {
            tokens[idx].attrPush(['class', 'external-link']);
          } else {
            tokens[idx].attrPush(['class', 'internal-link']);
          }
        }
        return defaultLinkOpen(tokens, idx, options, env, self);
      };

      // Enable line breaks
      md.set({ breaks: true });
    },
  },
});
```

## Table of Contents (TOC)

Stati automatically extracts Table of Contents data from markdown headings and makes it available in templates via `stati.page.toc`.

### TOC Entry Structure

Each TOC entry contains:

```typescript
interface TocEntry {
  /** Anchor ID for the heading (used in href="#id") */
  id: string;
  /** Plain text content of the heading */
  text: string;
  /** Heading level (2-6) */
  level: number;
}
```

### Template Usage

Build navigation from extracted headings:

```eta
<nav class="toc">
  <h2>On this page</h2>
  <ul>
    <% for (const entry of stati.page.toc) { %>
      <li class="<%= stati.propValue(`toc-level-${entry.level}`) %>">
        <a href="<%= `#${entry.id}` %>"><%= entry.text %></a>
      </li>
    <% } %>
  </ul>
</nav>
```

### Generated Anchor IDs

Stati generates URL-friendly anchor IDs from heading text:

| Heading | Generated ID |
|---------|--------------|
| `## Getting Started` | `getting-started` |
| `## API Reference` | `api-reference` |
| `## What's New?` | `what-s-new` |

**Duplicate Handling**: When headings have the same text, IDs are numbered:

| Heading | Generated ID |
|---------|--------------|
| `## Example` | `example` |
| `## Example` | `example-1` |
| `## Example` | `example-2` |

## Next Steps

- Learn about [Templates & Layouts](/core-concepts/templates) for rendering markdown
- Explore [Markdown concepts](/core-concepts/markdown) for content authoring
- See [Build Hooks](/api/hooks) for programmatic customization
