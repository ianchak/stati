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

Stati provides three options for markdown customization:

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
  // site: { … },
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
- **Linkify enabled**: URLs and email addresses in the text become links (see [Links](#links))
- **Typographer enabled**: Smart quotes and typography replacements

To change them, call `md.set()` in `configure`, for example `md.set({ html: false })` when your Markdown comes from untrusted authors.

### Links

Linkify follows markdown-it 15:

- URLs with a scheme, such as `https://example.com`, become links. A URL with a user name, such as `https://git@github.com/o/r.git`, is linked only up to the `@`.
- Domains without a scheme, such as `www.example.com`, stay text, and so do file names such as `README.md`.
- Text shaped like an email address becomes a `mailto:` link whatever its domain, package versions such as `react@18.3.1` included, so put those in backticks.

Change these with `md.linkify.set()` in `configure`:

```javascript
export default defineConfig({
  markdown: {
    configure: (md) => {
      md.linkify.set({
        fuzzyLink: true, // link www.example.com, and README.md with it
        fuzzyEmail: false, // stop linking email addresses
        urlAuth: true, // link https://git@github.com/o/r.git in full
      });
    },
  },
});
```

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

| Plugin | Package | Purpose |
|--------|---------|---------|
| `prism` | `markdown-it-prism` | Syntax highlighting at build time |
| `footnote` | `markdown-it-footnote` | Footnote support |
| `external-links` | `markdown-it-external-links` | External link attributes |
| `container` | `markdown-it-container` | Custom containers |
| `attrs` | `markdown-it-attrs` | Add attributes to elements |

With `markdown.toc` on, Stati sets the `id` of every `h2` to `h6` heading itself, which replaces an `{#id}` from markdown-it-attrs on those headings.

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

## Custom configuration

The `configure` option accepts a function that receives the markdown-it instance. This runs **after** plugins are loaded, allowing you to override plugin behavior.

`configure` is called synchronously and its return value is ignored, so an `async` function's awaited work may finish after pages have started rendering. Prepare anything asynchronous at the top level of your config module (with top-level `await`) and use the result inside `configure`.

In a TypeScript config, `md` is typed with markdown-it 15's own types, so `@types/markdown-it` isn't needed. To name the type in your own code, import it from Stati: `import type { MarkdownIt } from '@stati/core'`.

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

      // Wrap fenced code blocks (``` blocks use the "fence" rule)
      const defaultFence = md.renderer.rules.fence;
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const html = defaultFence(tokens, idx, options, env, self);
        return `<div class="code-block">${html}</div>`;
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

```eta
<link rel="stylesheet" href="<%= stati.url('/prism-theme.css') %>">
```

markdown-it-prism 4 puts the `language-xxx` class on `<code>` only, while Prism's themes style `pre[class*="language-"]`. Add `pre:has(> code[class*="language-"])` to those selectors, or code blocks lose the theme's padding and background.

**Pros:** No client-side JavaScript, no flash of unstyled code, many themes available
**Cons:** Only the languages Prism supports; the theme CSS is up to you

### Option 2: Client-side highlighting

Leave the Markdown as it is and load a highlighter in the browser, such as Prism or highlight.js, which picks up the `language-xxx` classes:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs/themes/prism.min.css">
<script src="https://cdn.jsdelivr.net/npm/prismjs/prism.min.js"></script>
```

Prism's core script highlights HTML, CSS and JavaScript; add a component script per other language, or Prism's autoloader plugin.

**Pros:** No build configuration
**Cons:** Requires JavaScript, and code is unstyled until the script runs

Other server-side highlighters work through `configure` as long as they are ready synchronously: create them with top-level `await` in your config module, then set `md.options.highlight` inside `configure`.

## Front matter

Stati reads YAML front matter: the lines between a `---` line at the start of the file and the next line that starts with `---`. This is not configurable.

- Quote a value that contains a colon followed by a space, such as `title: "Stati: a static site generator"`.
- Unquoted dates such as `date: 2024-01-15` are read as dates, quoted ones as text. Both work wherever Stati reads a date.
- Values follow YAML 1.2: `time: 10:30` is the text `10:30`, `0755` is the number 755, and `1_000` is text.
- Front matter that is not valid YAML stops the build with an error that names the file and the line. So does front matter that is a list or a single value instead of `key: value` lines, or that names another language after the opening `---`, such as `---js`. `---json` is read as JSON.

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

## Performance

Unchanged pages come from the build cache and are not rendered again (see [ISG](/core-concepts/isg)); with search on, every page's Markdown is still parsed for the search index. `configure` runs once per build, and once per dev server session. Stati uses markdown-it 15, which some older plugins don't support.

## Complete example

A production-ready markdown configuration:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    plugins: [
      // Syntax highlighting
      ['prism', { defaultLanguage: 'javascript' }],

      // External links
      ['external-links', {
        externalTarget: '_blank',
        internalDomains: ['stati.build'],
        internalClassName: 'internal-link',
      }],

      // Custom containers
      ['container', 'warning'],
      ['container', 'tip'],

      // Footnotes
      'footnote',
    ],

    configure: (md) => {
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

- Learn about [Templates and layouts](/core-concepts/templates) for rendering markdown
- Explore [Markdown concepts](/core-concepts/markdown) for content authoring
- See [Build Hooks](/api/hooks) for programmatic customization
