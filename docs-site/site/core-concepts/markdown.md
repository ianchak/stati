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

````

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

Code blocks automatically get syntax highlighting using Prism.js:

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
Visit https://stati.dev for more information.
Contact us at hello@stati.dev for support.
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
      'anchor',           // markdown-it-anchor
      'footnote',        // markdown-it-footnote
      ['mark', { /* options */ }], // markdown-it-mark with options
    ]
  },
});
```

**Note:** You need to install the plugins separately via npm:

```bash
npm install markdown-it-anchor markdown-it-footnote markdown-it-mark
```

## Configuration

### Basic Configuration

Configure markdown processing in `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  markdown: {
    // Markdown-It options
    options: {
      html: true, // Enable HTML tags in source
      linkify: true, // Auto-convert URL-like text to links
      typographer: true, // Enable smart quotes and other typographic substitutions
      breaks: false, // Convert '\n' in paragraphs into <br>
      xhtmlOut: false, // Use '/' to close single tags (<br />)
    },

    // Plugin configuration
    plugins: {
      anchor: {
        permalink: true,
        permalinkBefore: true,
        permalinkSymbol: '🔗',
      },
      toc: {
        includeLevel: [1, 2, 3],
        containerClass: 'table-of-contents',
      },
    },
  },
});
```

### Advanced Configuration

```javascript
export default defineConfig({
  markdown: {
    // Custom renderer modifications
    setup(md) {
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
    setup(md) {
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

Automatically generate excerpts:

```markdown
---
title: 'My Post'
---

This is the excerpt. It appears before the first <!--more--> comment.

<!--more-->

This is the full content that appears after the excerpt separator.
```

### Markdown in Templates

Process markdown within templates:

```eta
<%
// Process markdown at build time
const additionalContent = `
## Dynamic Section

This content is **processed** at build time.
`;
%>

<div class="dynamic-content">
  <%~ stati.renderMarkdown(additionalContent) %>
</div>
```

## Performance Optimization

### Caching

Markdown processing is cached by default:

- **Parsed content** is cached based on file modification time
- **Rendered HTML** is cached until source changes
- **Plugin outputs** are cached when possible

### Build-time Processing

All markdown processing happens at build time:

```javascript
// This runs during build, not at runtime
export default defineConfig({
  markdown: {
    setup(md) {
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

### Incremental Regeneration

With ISG, only changed markdown files are reprocessed:

```javascript
export default defineConfig({
  isg: {
    ttlSeconds: 3600, // Cache for 1 hour

    // Invalidation rules
    invalidation: {
      // Invalidate when markdown files change
      patterns: ['**/*.md'],

      // Invalidate dependent pages
      dependencies: {
        'blog/index.md': ['blog/**/*.md'],
      },
    },
  },
});
```

## Advanced Features

### Custom Markdown Extensions

Create domain-specific extensions:

```javascript
// Extension for API documentation
function apiDocPlugin(md) {
  md.inline.ruler.before('emphasis', 'api_endpoint', function (state, silent) {
    const match = state.src.slice(state.pos).match(/^@(GET|POST|PUT|DELETE)\s+(.+?)@/);
    if (!match) return false;

    if (!silent) {
      const token = state.push('api_endpoint', '', 0);
      token.content = match[0];
      token.meta = { method: match[1], endpoint: match[2] };
    }

    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules.api_endpoint = function (tokens, idx) {
    const token = tokens[idx];
    const { method, endpoint } = token.meta;
    return `<span class="api-endpoint method-${method.toLowerCase()}">
      <code class="method">${method}</code>
      <code class="endpoint">${endpoint}</code>
    </span>`;
  };
}
```

Usage:

```markdown
Use the @GET /api/users@ endpoint to fetch user data.
Send a @POST /api/users@ request to create a new user.
```

### Content Transformation

Transform content based on context:

```javascript
export default defineConfig({
  markdown: {
    setup(md) {
      // Transform relative images to absolute
      const defaultImageRule = md.renderer.rules.image;
      md.renderer.rules.image = function (tokens, idx, options, env) {
        const token = tokens[idx];
        const src = token.attrGet('src');

        if (src && !src.startsWith('http') && !src.startsWith('/')) {
          token.attrSet('src', `/images/${src}`);
        }

        return defaultImageRule(tokens, idx, options, env);
      };
    },
  },
});
```

## Testing and Debugging

### Markdown Debugging

```javascript
export default defineConfig({
  markdown: {
    setup(md) {
      if (process.env.NODE_ENV === 'development') {
        // Log markdown processing
        md.core.ruler.push('debug', function (state) {
          console.log('Processing:', state.src.slice(0, 100));
          return true;
        });
      }
    },
  },
});
```

### Content Validation

```javascript
// Validate markdown content during build
export default defineConfig({
  hooks: {
    beforeRender(page) {
      // Check for common issues
      if (page.content.includes('TODO')) {
        console.warn(`TODO found in ${page.path}`);
      }

      // Validate front matter
      if (!page.title) {
        throw new Error(`Missing title in ${page.path}`);
      }
    },
  },
});
```

The markdown pipeline is one of Stati's core features, providing powerful content processing with extensible plugins. Next, learn about [Incremental Static Generation](/core-concepts/isg/) to understand how Stati handles caching and rebuilds.
