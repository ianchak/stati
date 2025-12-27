---
title: 'Markdown Pipeline'
description: 'Learn how Stati processes and renders Markdown content with advanced features.'
order: 4
---

# Markdown Pipeline

Stati uses Markdown-It as its core markdown processor, enhanced with carefully selected plugins and customization options. The pipeline is designed to be extensible and developer-friendly while supporting modern markdown features.

## Core Features

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

```text
### Front Matter

Every markdown file can include YAML front matter:

```markdown
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

### Syntax Highlighting

Code blocks in markdown are rendered with language class attributes. To add syntax highlighting, you need to include a client-side library like Prism.js or Highlight.js in your templates.

Stati automatically adds language classes to code blocks:

```html
<!-- Rendered output for code blocks -->
<pre><code class="language-typescript">
// Your code here
</code></pre>
```

**To add syntax highlighting:**

1. Choose a highlighting library (Prism.js, Highlight.js, etc.)
2. Include the library CSS and JS in your layout template
3. Code blocks will be automatically highlighted client-side

**Example with Prism.js:**

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

## Enhanced Features

### Table Support

Create tables using standard markdown table syntax:

```markdown
| Feature        | Stati          | Other SSGs  |
| -------------- | -------------- | ----------- |
| TypeScript     | ✅ First-class | ⚠️ Add-on   |
| ISG            | ✅ Built-in    | ❌ Manual   |
| esbuild        | ✅ Integrated  | ⚠️ Optional |
| Simplicity     | ✅ Minimal     | 📦 Varies   |
```

Renders as:

| Feature        | Stati          | Other SSGs  |
| -------------- | -------------- | ----------- |
| TypeScript     | ✅ First-class | ⚠️ Add-on   |
| ISG            | ✅ Built-in    | ❌ Manual   |
| esbuild        | ✅ Integrated  | ⚠️ Optional |
| Simplicity     | ✅ Minimal     | 📦 Varies   |

### Task Lists

Create interactive checkboxes:

```markdown
- [x] Completed task
- [ ] Pending task
- [x] Another completed task
- [ ] Future task
```

- [x] Completed task
- [ ] Pending task
- [x] Another completed task
- [ ] Future task

### Auto-linking

URLs and email addresses are automatically converted to links:

```markdown
Visit https://stati.build for more information.
Contact us at hello@stati.build for support.
```

### Typography Enhancements

Smart quotes, em-dashes, and ellipses:

```markdown
"Smart quotes" and 'apostrophes'
En-dash (--) and em-dash (---)
Ellipsis (...)
```

## Markdown Configuration

### Base Configuration

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

### Basic Configuration

Configure markdown processing in `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Plugins array - Stati auto-prepends 'markdown-it-'
    plugins: [
      'footnote',               // Plugin name only
      ['emoji', { shortcuts: {} }],  // Plugin with options
    ],

    // Custom markdown-it configuration
    configure: (md) => {
      // Modify settings (html, linkify, typographer are enabled by default)
      md.set({ breaks: true });

      // Add custom rendering rules
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        return `<code class="inline-code">${token.content}</code>`;
      };
    },

    // Enable/disable TOC extraction and heading anchors (default: true)
    toc: true,
  },
});
```

> **Note:** HTML tags, linkify, and typographer are enabled by default in Stati and cannot be disabled. TOC extraction and heading anchors are also built-in.

### Advanced Configuration

```javascript
export default defineConfig({
  markdown: {
    // Custom renderer modifications
    configure(md) {
      // Add custom rules
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        return `<code class="inline-code">${token.content}</code>`;
      };

      // Add custom plugins
      md.use(customPlugin, options);

      // Modify existing rules
      const defaultCodeBlockRule = md.renderer.rules.code_block;
      md.renderer.rules.code_block = (tokens, idx, options, env) => {
        const token = tokens[idx];
        const langClass = token.info ? ` class="language-${token.info}"` : '';
        return `<pre${langClass}><code>${token.content}</code></pre>`;
      };
    },
  },
});
```

## Custom Plugins

### Creating a Plugin

```javascript
// plugins/custom-alerts.js
function alertPlugin(md, options = {}) {
  const defaultRender =
    md.renderer.rules.blockquote_open ||
    function (tokens, idx, options, env, renderer) {
      return renderer.renderToken(tokens, idx, options);
    };

  md.renderer.rules.blockquote_open = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx];
    const nextToken = tokens[idx + 1];

    if (nextToken && nextToken.content.startsWith('[!')) {
      const match = nextToken.content.match(/^\[!(.*?)\]/);
      if (match) {
        const alertType = match[1].toLowerCase();
        return `<div class="alert alert-${alertType}">`;
      }
    }

    return defaultRender(tokens, idx, options, env, renderer);
  };
}

// Usage in config
export default defineConfig({
  markdown: {
    configure(md) {
      md.use(alertPlugin);
    },
  },
});
```

### Using Custom Alerts

```markdown
> [!NOTE]
> This is a note alert.

> [!WARNING]
> This is a warning alert.

> [!TIP]
> This is a tip alert.
```

## Content Processing

### Front Matter Processing

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

### Content Excerpts

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

## Performance Optimization

### Build-time Processing

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
