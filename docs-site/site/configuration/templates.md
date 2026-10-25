---
title: 'Templates'
description: 'Register template helpers and learn which Eta settings Stati fixes.'
order: 3
seo:
  title: 'Template configuration'
---

# Templates

Stati uses the [Eta template engine](https://eta.js.org/) to process templates and layouts. Most Eta settings are hardcoded for reliability, but you can register your own helper functions for templates to call.

## Configuration options

Stati's template configuration is minimal by design. The only template option is `helpers`, at the top level of the config:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  // Functions templates call as stati.helpers.name()
  helpers: {
    uppercase: (str) => String(str).toUpperCase(),
    lowercase: (str) => String(str).toLowerCase(),
  },
});
```

## Helpers

Helpers are functions your templates call. They're useful for formatting dates, manipulating strings, or performing calculations that several templates share.

### Defining helpers

```javascript
export default defineConfig({
  helpers: {
    // Date formatting
    formatDate: (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },

    // Text truncation
    truncate: (text, length = 100) => {
      if (!text || text.length <= length) return text;
      return text.substring(0, length) + '...';
    },

    // Number formatting
    formatNumber: (num) => {
      return Number(num).toLocaleString('en-US');
    },

    // Relative time
    timeAgo: (date) => {
      const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
      const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
      };

      for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
          return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
        }
      }
      return 'just now';
    },
  },
});
```

`helpers` must be an object of functions: the config fails to load when it is something else or when one of its entries is not a function. In a TypeScript config, `helpers` is typed `Record<string, (...args: any[]) => unknown>`, so each helper declares whatever parameters it needs.

### Using helpers

Call helpers from any template as `stati.helpers.name()`:

```eta
<h1><%= stati.helpers.uppercase('hello world') %></h1>
<!-- Result: HELLO WORLD -->

<time><%= stati.helpers.formatDate(stati.page.date) %></time>
<!-- Result: January 15, 2024 -->

<p><%= stati.helpers.truncate(stati.page.description, 150) %></p>
<!-- Result: First 150 characters... -->

<span><%= stati.helpers.timeAgo(stati.page.publishedAt) %></span>
<!-- Result: 3 days ago -->
```

Helpers reach every template Stati renders: layouts, the shells they name with `stati.layout()`, templates included with `stati.include()` and the Open Graph template.

- The root of `stati` belongs to Stati, so a helper never replaces one of its values: a helper named `slugify` is `stati.helpers.slugify`, and `stati.slugify()` stays Stati's own.
- A helper written with `function` or method syntax gets the helpers object as `this`, so it can call another helper as `this.formatDate()`. Helpers do not receive the template context; pass what they need as arguments.
- During `stati dev`, a misspelled helper (`stati.helpers.formatDat`) and a call without the `helpers.` part (`stati.formatDate`) both throw an error suggesting `stati.helpers.formatDate`.
- Helpers are config code. Changing one does not rebuild cached pages, so run `stati build --force` after editing a helper whose output appears on cached pages.

## Hardcoded settings

The following Eta settings are hardcoded and cannot be configured:

- **Template directory**: Always `srcDir` (default `'site'`)
- **Variable name**: Always `'stati'` (the context object in templates)
- **Delimiters**: Always `<%` and `%>`
- **Escaping**: `<%= %>` HTML-escapes its value; `<%~ %>` prints it as-is
- **Caching**: Compiled templates are cached in production and development; the dev server clears the cache when a template changes
- **File extension**: Always `.eta`
- **Composition**: Templates combine with `stati.include()` and `stati.layout()`; Eta's own `include()`, `layout()` and `block()` are not available. See [Includes and layouts](/api/templates#includes-and-layouts).

## Advanced helper patterns

### Combining helpers

You can combine helpers for complex transformations:

```eta
<!-- Combine helpers with Stati's own functions -->
<%= stati.slugify(stati.helpers.lowercase(stati.page.title)) %>

<!-- Or build a local function from them -->
<%
const titleSlug = (title) => stati.slugify(stati.helpers.lowercase(title));
%>
<a href="<%= `/posts/${titleSlug(stati.page.title)}` %>"><%= stati.page.title %></a>
```

### Conditional helpers

Choose a helper based on a condition:

```eta
<%
const displayDate = (date, format = 'short') => {
  if (format === 'relative') {
    return stati.helpers.timeAgo(date);
  }
  return stati.helpers.formatDate(date);
};
%>

<time><%= displayDate(stati.page.date, 'relative') %></time>
```

### Helpers with external dependencies

Import utilities in your config file for use in helpers:

```javascript
import { marked } from 'marked';
import hljs from 'highlight.js';

export default defineConfig({
  helpers: {
    // Process markdown in templates
    renderMarkdown: (content) => {
      return marked(String(content));
    },

    // Syntax highlighting
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(String(code), { language: lang }).value;
      }
      return hljs.highlightAuto(String(code)).value;
    },
  },
});
```

These helpers return HTML, so print them raw: `<%~ stati.helpers.highlight(snippet, 'ts') %>`. Only pass trusted content.

## Helper examples

Here are practical helper examples you can use in your project:

```javascript
export default defineConfig({
  helpers: {
    // Date and time helpers
    formatDate: (date, options = {}) => {
      const defaults = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Date(date).toLocaleDateString('en-US', {
        ...defaults,
        ...options,
      });
    },

    timeAgo: (date) => {
      const now = new Date();
      const diffMs = now - new Date(date);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    },

    // String manipulation helpers
    capitalize: (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    camelCase: (str) => {
      return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
    },

    kebabCase: (str) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    },

    // Content helpers
    excerpt: (content, length = 150) => {
      // Remove HTML tags and truncate
      const text = content.replace(/<[^>]*>/g, '');
      return text.length > length ? text.substring(0, length).trim() + '...' : text;
    },

    readingTime: (content) => {
      const wordsPerMinute = 200;
      const words = content.trim().split(/\s+/).length;
      const minutes = Math.ceil(words / wordsPerMinute);
      return `${minutes} min read`;
    },

    // URL and path helpers
    absoluteUrl: (path, base) => {
      if (path.startsWith('http')) return path;
      return new URL(path, base || 'https://example.com').href;
    },

    // Array and object helpers
    sortBy: (array, key, direction = 'asc') => {
      return [...array].sort((a, b) => {
        const aVal = key.split('.').reduce((obj, k) => obj?.[k], a);
        const bVal = key.split('.').reduce((obj, k) => obj?.[k], b);

        if (direction === 'desc') {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    },

    groupBy: (array, key) => {
      return array.reduce((groups, item) => {
        const group = key.split('.').reduce((obj, k) => obj?.[k], item);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      }, {});
    },
  },
});
```

## Using helpers in templates

Once defined, helpers are available on `stati.helpers`:

```eta
<!-- String manipulation -->
<h1><%= stati.helpers.capitalize(stati.page.title) %></h1>
<p class="<%= stati.helpers.kebabCase(stati.page.category) %>"></p>

<!-- Date formatting -->
<time><%= stati.helpers.formatDate(stati.page.date) %></time>
<span><%= stati.helpers.timeAgo(stati.page.publishedAt) %></span>

<!-- Content processing -->
<p><%= stati.helpers.excerpt(stati.page.content, 200) %></p>
<span><%= stati.helpers.readingTime(stati.page.content) %></span>

<!-- Arrays and objects -->
<%
const posts = stati.collection?.recentPages ?? [];
const sortedPosts = stati.helpers.sortBy(posts, 'publishedAt', 'desc');
const postsByTag = stati.helpers.groupBy(posts, 'frontMatter.category');
%>
```

## TypeScript bundle access

When TypeScript is enabled, Stati provides access to compiled bundle paths via `stati.assets.bundlePaths`. This is useful for preloading, custom script placement, or conditional rendering.

### Auto-injection (default behavior)

By default, Stati **automatically injects** all matched bundle scripts before the closing `</body>` tag. You don't need to add script tags manually - they're handled for you during both development and production builds.

### Accessing bundle paths

If you need to access bundle paths in your templates (for example, to preload modules or customize their placement), use `stati.assets.bundlePaths`:

```eta
<head>
  <!-- Preload all matched bundles for this page -->
  <% if (stati.assets?.bundlePaths) { %>
    <% for (const path of stati.assets.bundlePaths) { %>
    <link rel="modulepreload" href="<%= stati.url(path) %>">
    <% } %>
  <% } %>
</head>
```

Bundle paths are relative to the site root. Pass them through [`stati.url()`](/api/templates#stati-url-path) so they also work when the site is [served from a subfolder](/advanced/deploying-to-a-subfolder); Stati's own injected `<script>` tags already include the base path.

### Conditional rendering

Check if any bundles are available before rendering:

```eta
<% if (stati.assets?.bundlePaths && stati.assets.bundlePaths.length > 0) { %>
  <!-- Page has TypeScript bundles -->
  <div class="interactive-content">
    <!-- Your interactive content here -->
  </div>
<% } else { %>
  <!-- Static fallback content -->
  <div class="static-content">
    <!-- Fallback for pages without JavaScript -->
  </div>
<% } %>
```

### Bundle paths array

The `bundlePaths` array contains paths to all bundles matched for the current page based on your TypeScript configuration:

- Global bundles (no `include` pattern) appear on all pages
- Targeted bundles appear only on pages matching their `include` patterns
- Bundles are listed in the order defined in your config

```eta
<!-- Debug: Show which bundles are loaded on this page -->
<% if (stati.assets?.bundlePaths) { %>
<script>
  console.log('Bundles for this page:', <%~ JSON.stringify(stati.assets.bundlePaths) %>);
</script>
<% } %>
```

Use `<%~` here: `<%=` would HTML-escape the quotes in the JSON and break the script.

## Stylesheet access

With `--tailwind-input` and `--tailwind-output`, `stati.assets.stylesheetPaths` holds the path of the stylesheet Stati builds with Tailwind, and Stati links it on every page. See [Linking it yourself](/configuration/css#linking-it-yourself) for placing the link with `css.autoInject: false`.

For more details on configuring multiple bundles, see [TypeScript Support](/configuration/typescript).

## Best practices

1. **Keep helpers simple**: Each helper should do one thing well
2. **Handle edge cases**: Check for null, undefined, and invalid inputs
3. **Return consistent types**: Always return the same data type
4. **Avoid side effects**: Helpers should be pure functions
5. **Document complex helpers**: Add comments for non-obvious logic

## Next steps

- See [Templates & Layouts](/core-concepts/templates) for template usage
- Learn about [built-in functions](/api/templates#built-in-functions) like `stati.propValue()`
- Explore [SEO configuration](/configuration/seo) for meta tag generation
