---
title: 'Markdown pipeline'
description: 'Learn how Stati processes and renders Markdown content with advanced features.'
order: 4
---

# Markdown pipeline

Stati uses Markdown-It as its core markdown processor, enhanced with carefully selected plugins and customization options. The pipeline is designed to be extensible and developer-friendly while supporting modern markdown features.

## Core features

### Standard Markdown

Stati supports all standard Markdown syntax out of the box:

````markdown
# Headings

## Subheadings

### And so on...

**Bold text** and _italic text_

[Links](https://example.com) and [internal links](/getting-started/introduction/)

- Unordered lists
- With multiple items

1. Ordered lists
2. With numbers

> Blockquotes for emphasis
> Can span multiple lines

`Inline code` and:

```javascript
// Code blocks with syntax highlighting
function hello() {
  console.log('Hello, Stati!');
}
```
````

### Front matter

Every markdown file can include YAML front matter:

````markdown
---
title: 'My Page Title'
description: 'A brief description for SEO'
date: '2024-01-15'
tags: ['stati', 'markdown', 'documentation']
author: 'John Doe'
draft: false
layout: 'post'
---

# Your content starts here...
````

### Syntax highlighting

Code blocks in markdown are rendered with language class attributes, without highlighting:

```html
<!-- Rendered output for code blocks -->
<pre><code class="language-typescript">
// Your code here
</code></pre>
```

To highlight code, either add the `markdown-it-prism` plugin, which highlights at build time with no browser JavaScript (see [Syntax highlighting](/configuration/markdown#syntax-highlighting)), or load a client-side library that picks up the `language-*` classes:

**Example with Prism.js in the browser:**

```eta
<!-- In your layout.eta -->
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs/themes/prism.min.css">
  <script src="https://cdn.jsdelivr.net/npm/prismjs/prism.min.js"></script>
</head>
```

**Markdown example:**

````markdown
```typescript
interface StatiConfig {
  site: {
    title: string;
    baseUrl: string;
  };
  markdown?: MarkdownConfig;
}
```

```css
.highlight {
  background: #f0f8ff;
  border-left: 4px solid #0066cc;
  padding: 1rem;
}
```

```bash
npm install @stati/core
npm run build
```
````

## Enhanced features

### Table support

Create tables using standard markdown table syntax:

```markdown
| Command         | Purpose                    |
| --------------- | -------------------------- |
| `stati dev`     | Development server         |
| `stati build`   | Production build           |
| `stati preview` | Serve the built site       |
```

Renders as:

| Command         | Purpose                    |
| --------------- | -------------------------- |
| `stati dev`     | Development server         |
| `stati build`   | Production build           |
| `stati preview` | Serve the built site       |

### Images

Stati reads the size of each Markdown image and writes it into the HTML, with lazy loading:

```markdown
![Harbour at dawn](/images/harbour.jpg)
![Map of the route](./map.png)
```

```html
<img src="/images/harbour.jpg" alt="Harbour at dawn" width="1600" height="900" loading="lazy" decoding="async">
```

A path that starts with `/` is read from `public/`. A relative path is read next to the page's Markdown file, and Stati copies that image to `/_img/`. With the optional `@stati/images` package, images can also get responsive AVIF and WebP versions. See [Images](/configuration/images) for the details and for turning this off.

### Task lists

Task list syntax (`- [x] Done`) is **not** supported out of the box: markdown-it renders the brackets as text. Add a markdown-it task-list plugin through `markdown.plugins` or `configure` if you need checkboxes.

### Auto-linking

URLs with a scheme (`https://stati.build`) are converted to links. Bare domains and email addresses (`example.com`, `hello@example.com`) are linked too, but only when their top-level domain is a common one such as `.com`, `.org` or `.net`; `stati.build` or `hello@stati.build` stay plain text. Write a Markdown link when in doubt:

```markdown
Visit https://stati.build for more information.
Contact us at [hello@stati.build](mailto:hello@stati.build) for support.
```

### Typography enhancements

Smart quotes, em-dashes, and ellipses:

```markdown
"Smart quotes" and 'apostrophes'
En-dash (--) and em-dash (---)
Ellipsis (...)
```

## Markdown configuration

### Base configuration

Stati uses Markdown-It with the following default configuration:

- **HTML tags** - Enabled for raw HTML in markdown
- **Linkify** - Auto-convert URLs to clickable links
- **Typographer** - Smart quotes and other typography enhancements

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    plugins: [
      'footnote',        // markdown-it-footnote
      ['mark', { /* options */ }], // markdown-it-mark with options
    ]
  },
});
```

> **Note:** TOC extraction and heading anchor generation are built into Stati and enabled by default. You don't need `markdown-it-anchor` or `markdown-it-toc-done-right` plugins.

**Note:** You need to install the plugins separately via npm:

```bash
npm install markdown-it-footnote markdown-it-mark
```

## Configuration

### Basic configuration

Configure markdown processing in `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Plugins array - Stati auto-prepends 'markdown-it-'
    plugins: [
      'footnote',                                   // Plugin name only
      ['container', 'tip'],                         // Plugin with an argument
    ],

    // Custom markdown-it configuration
    configure: (md) => {
      // Modify settings (html, linkify, typographer are enabled by default)
      md.set({ breaks: true });

      // Add custom rendering rules
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        return `<code class="inline-code">${md.utils.escapeHtml(token.content)}</code>`;
      };
    },

    // Enable/disable TOC extraction and heading anchors (default: true)
    toc: true,
  },
});
```

> **Note:** HTML tags, linkify, and typographer are enabled by default; change them with `md.set()` in `configure`. TOC extraction and heading anchors are built in and controlled by `markdown.toc`.

### Advanced configuration

```javascript
export default defineConfig({
  markdown: {
    // Custom renderer modifications
    configure(md) {
      // Add custom rules
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        return `<code class="inline-code">${md.utils.escapeHtml(token.content)}</code>`;
      };

      // Add custom plugins
      md.use(customPlugin, options);

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

## Custom plugins

### Creating a plugin

A markdown-it plugin is a function that receives the `md` instance. This one adds an `alert` class to blockquotes that start with `[!NOTE]`, `[!TIP]` or `[!WARNING]`, and removes the marker:

```javascript
// plugins/alerts.js
export function alertPlugin(md) {
  md.core.ruler.push('alerts', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue;
      // blockquote_open → paragraph_open → inline
      const inline = tokens[i + 2];
      const match = inline?.type === 'inline' && inline.content.match(/^\[!(NOTE|TIP|WARNING)\]/);
      if (!match) continue;
      tokens[i].attrJoin('class', `alert alert-${match[1].toLowerCase()}`);
      // Remove the [!TYPE] marker (and the line break after it)
      const children = inline.children ?? [];
      if (children[0]?.type === 'text') {
        children[0].content = children[0].content.slice(match[0].length).trimStart();
        if (!children[0].content) children.splice(0, children[1]?.type === 'softbreak' ? 2 : 1);
      }
    }
  });
}

// stati.config.js
import { defineConfig } from '@stati/core';
import { alertPlugin } from './plugins/alerts.js';

export default defineConfig({
  markdown: {
    configure(md) {
      md.use(alertPlugin);
    },
  },
});
```

### Using custom alerts

```markdown
> [!NOTE]
> This is a note alert.

> [!WARNING]
> This is a warning alert.
```

Each renders as `<blockquote class="alert alert-note">…</blockquote>`, ready for your CSS.

## Content processing

### Front matter processing

Front matter is parsed and made available to templates:

```markdown
---
title: 'Advanced Guide'
lastModified: '2024-01-15'
contributors: ['John', 'Jane']
difficulty: 'advanced'
estimatedTime: '30 minutes'
---

# Content here...
```

> **Note:** Stati supports standard frontmatter fields like `title`, `description`, `tags`, `layout`, `date`, `order`, and `draft`. You can also add custom fields (like `difficulty`, `estimatedTime`, `lastModified`, `contributors` above) which will be available in templates via `stati.page.*`.

Access in templates:

```eta
<article class="<%= stati.propValue('difficulty', `difficulty-${stati.page.difficulty}`) %>">
  <header>
    <h1><%= stati.page.title %></h1>
    <div class="meta">
      <span>Difficulty: <%= stati.page.difficulty %></span>
      <span>Est. time: <%= stati.page.estimatedTime %></span>
      <span>Last updated: <%= new Date(stati.page.lastModified).toLocaleDateString() %></span>
    </div>
  </header>

  <div class="content">
    <%~ stati.content %>
  </div>
</article>
```

### Content excerpts

Stati does not currently provide built-in excerpt support. To create excerpts, you can:

1. Add an `excerpt` field to your frontmatter
2. Use custom filters to truncate content
3. Process content in build hooks

**Example using frontmatter:**

```markdown
---
title: 'My Post'
excerpt: 'This is a custom excerpt for the post.'
---

# My Post

Full content goes here...
```

Access in templates:

```eta
<p class="excerpt"><%= stati.page.excerpt %></p>
```

## Performance optimization

### Build-time processing

All markdown processing happens at build time, not at runtime. This means:

- Markdown is parsed and rendered to HTML during the build
- All plugins run once during build
- The output is static HTML with no runtime markdown processing

```javascript
// This runs during build, not at runtime
export default defineConfig({
  markdown: {
    configure(md) {
      // Expensive processing is done once during build
      md.use(expensivePlugin, {
        // Pre-computed options
        dictionary: loadLargeDictionary(),
        rules: compileComplexRules(),
      });
    },
  },
});
```

### Incremental Static Generation

Stati's ISG system provides intelligent caching for rendered pages:

- **Page caching** - Rendered HTML is cached and only rebuilt when content or dependencies change
- **Content hash tracking** - Changes trigger rebuilds automatically
- **Template dependency tracking** - Updates to layouts or partials invalidate dependent pages
- **TTL-based rebuilds** - Configure how long pages stay cached

See the [ISG Configuration](/configuration/isg) documentation for details on cache TTL, aging rules, and invalidation strategies.

The markdown pipeline is one of Stati's core features, providing powerful content processing with extensible plugins. Next, learn about [Incremental Static Generation](/core-concepts/isg) to understand how Stati handles caching and rebuilds.
