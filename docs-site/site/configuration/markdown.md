---
title: 'Markdown'
description: 'Configure markdown-it plugins and customize markdown rendering.'
order: 4
seo:
  title: 'Markdown configuration'
---

# Markdown

Stati uses [markdown-it](https://github.com/markdown-it/markdown-it) as its markdown processor. The engine is configured with sensible defaults, and you can extend it with plugins or customize rendering behavior.

## Configuration options

Stati provides two options for markdown customization:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Array of markdown-it plugins (Stati auto-prepends 'markdown-it-')
    plugins: [
      'footnote',                                  // Plugin name only
      ['prism', { defaultLanguage: 'javascript' }], // Plugin with options
    ],

    // Custom configuration function (runs after the plugins, synchronously)
    configure: (md) => {
      // Receive markdown-it instance
      // Customize rendering, add plugins, etc.
    },

    // Enable/disable TOC extraction (default: true)
    toc: true,
  },
});
```

> **Note:** TOC extraction and heading anchor generation are built into Stati and enabled by default. You don't need external plugins for these features.

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

## Default settings

Stati creates markdown-it with these settings:

- **HTML enabled**: HTML tags are allowed in markdown source
- **Linkify enabled**: URLs are automatically converted to links
- **Typographer enabled**: Smart quotes and typography replacements

To change them, call `md.set()` in `configure`, for example `md.set({ html: false })` when your Markdown comes from untrusted authors.

## Markdown plugins

The `plugins` option accepts an array of markdown-it plugins. Stati automatically prepends `markdown-it-` to plugin names, so `'footnote'` loads the `markdown-it-footnote` package from your project.

Stati passes the package's default export to `md.use()`. A plugin that only has named exports (such as `markdown-it-emoji` 3, which exports `full`, `light` and `bare`) cannot be loaded by name: Stati logs "Failed to load markdown plugin" and continues without it. Load such plugins in `configure` instead (see [Custom configuration](#custom-configuration)). A plugin that is not installed also only logs this warning, so check the build output.

### Plugin format

**Simple plugin** (string):

```javascript
export default defineConfig({
  markdown: {
    plugins: ['footnote', 'external-links'],
  },
});
```

**Plugin with options** (array):

```javascript
export default defineConfig({
  markdown: {
    plugins: [
      ['prism', {
        defaultLanguage: 'javascript',
      }],
      ['external-links', {
        externalTarget: '_blank',
      }],
    ],
  },
});
```

### Plugin installation

Plugins must be installed as npm dependencies:

```bash
npm install markdown-it-footnote
npm install markdown-it-prism
npm install markdown-it-external-links
```

### Common plugins

> **Built-in Features:** Stati has built-in TOC extraction and heading anchor generation (enabled by default). You don't need `markdown-it-anchor` or `markdown-it-toc-done-right` plugins.

| Plugin | Package | Purpose |
|--------|---------|---------|
| `prism` | `markdown-it-prism` | Syntax highlighting at build time |
| `footnote` | `markdown-it-footnote` | Footnote support |
| `external-links` | `markdown-it-external-links` | External link attributes |
| `container` | `markdown-it-container` | Custom containers |
| `attrs` | `markdown-it-attrs` | Add attributes to elements |

For emoji shortcodes, load `markdown-it-emoji` in `configure`, because version 3 has no default export:

```javascript
import { full as emoji } from 'markdown-it-emoji';

export default defineConfig({
  markdown: {
    configure: (md) => {
      md.use(emoji);
    },
  },
});
```

### Example: Complete plugin setup

```javascript
export default defineConfig({
  markdown: {
    // Note: TOC and heading anchors are built-in (enabled by default)
    plugins: [
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
    ],
  },
});
```

## Custom configuration

The `configure` option accepts a function that receives the markdown-it instance. This runs **after** plugins are loaded, allowing you to override plugin behavior.

`configure` is called synchronously and its return value is ignored, so an `async` function's awaited work may finish after pages have started rendering. Prepare anything asynchronous at the top level of your config module (with top-level `await`) and use the result inside `configure`.

### Basic customization

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

### Custom renderer rules

Customize how specific markdown elements are rendered:

```javascript
export default defineConfig({
  markdown: {
    configure: (md) => {
      // Customize heading rendering. Keep the token's attributes:
      // Stati stores the heading's anchor id there for the TOC.
      md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        token.attrJoin('class', `heading heading-${token.tag}`);
        return self.renderToken(tokens, idx, options);
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

> **Note:** Stati renders Markdown images with its own `image` rule, which adds `width`, `height` and lazy loading, and with [`images.responsive`](/configuration/images#responsive-images) writes a `<picture>`. Plugins and `configure` run after it, so a rule that replaces `md.renderer.rules.image` without calling the previous one turns that off. Keep the previous rule and call it, as the link rule above does; attributes you set on the token, such as a `class`, are kept on the `<img>`.

### Custom block syntax

Create custom container syntax:

```javascript
export default defineConfig({
  markdown: {
    // Each entry is [pluginName, containerName]; requires markdown-it-container
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

## Syntax highlighting

Stati doesn't provide built-in syntax highlighting. Without a plugin, fenced code blocks are rendered as `<pre><code class="language-xxx">` so that you can add highlighting yourself. You have two options:

### Option 1: Build-time highlighting (recommended)

The `markdown-it-prism` plugin highlights code with Prism while Stati builds the page, so the HTML arrives already highlighted and no script is needed in the browser. This site uses it.

**Install:**

```bash
npm install markdown-it-prism prismjs
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

**Add a Prism theme stylesheet to your layout** (any Prism theme CSS, copied into `public/`):

```html
<link rel="stylesheet" href="/prism-theme.css">
```

**Pros:** No client-side JavaScript, no flash of unstyled code, many themes available
**Cons:** Only the languages Prism supports; the theme CSS is up to you

### Option 2: Client-side highlighting

Leave the Markdown as it is and load a highlighter in the browser, such as Prism or highlight.js, which picks up the `language-xxx` classes:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs/themes/prism.min.css">
<script src="https://cdn.jsdelivr.net/npm/prismjs/prism.min.js"></script>
```

**Pros:** No build configuration
**Cons:** Requires JavaScript, and code is unstyled until the script runs

Other server-side highlighters work through `configure` as long as they are ready synchronously: create them with top-level `await` in your config module, then set `md.options.highlight` inside `configure`.

## Front matter

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

## Best practices

### Plugin selection

1. **Install only what you need** - Each plugin adds processing overhead
2. **Check compatibility** - Ensure plugins work with your markdown-it version
3. **Test thoroughly** - Some plugins may conflict with each other

### Custom rendering

1. **Use configure for overrides** - The configure function runs after plugins
2. **Preserve defaults** - Store default renderer before overriding
3. **Handle edge cases** - Check for null/undefined values in custom rules

### Performance

1. **Limit plugins** - Too many plugins slow down builds
2. **Rely on ISG** - Unchanged pages are served from the build cache and are not re-parsed (see [ISG](/core-concepts/isg))
3. **Keep `configure` cheap** - It runs once per build (once per dev server session)

## Complete example

A production-ready markdown configuration:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Note: TOC and heading anchors are built-in (enabled by default)
    plugins: [
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

## Table of contents (TOC)

Stati automatically extracts Table of Contents data from markdown headings and makes it available in templates via `stati.page.toc`.

### TOC entry structure

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

### Template usage

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

### Generated anchor IDs

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

## Next steps

- Learn about [Templates & Layouts](/core-concepts/templates) for rendering markdown
- Explore [Markdown concepts](/core-concepts/markdown) for content authoring
- See [Build Hooks](/api/hooks) for programmatic customization
