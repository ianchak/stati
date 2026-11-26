---
title: 'Templates'
description: 'Register template helpers and learn which Eta settings Stati fixes.'
order: 3
seo:
  title: 'Template configuration'
---

# Templates

Stati uses the [Eta template engine](https://eta.js.org/) to process templates and layouts. Its settings are fixed, but you can register your own helper functions for templates to call.

## Helpers

The only template option is `helpers`, at the top level of the config: functions your templates call as `stati.helpers.name()`, for formatting that several templates share.

### Defining helpers

```javascript
export default defineConfig({
  helpers: {
    uppercase: (str) => String(str).toUpperCase(),

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

## Helpers that use packages

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
