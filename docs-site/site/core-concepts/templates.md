---
title: 'Templates and layouts'
description: 'Eta layouts chosen by folder, shared page shells with stati.layout(), templates included with props, and helpers.'
order: 3
---

# Templates and layouts

Stati renders pages with [Eta](https://eta.js.org/) templates. Layouts are chosen by folder, share one page shell through `stati.layout()`, and reuse other templates through `stati.include()`.

## Template engine: Eta

Code inside `<% %>` tags is plain JavaScript: Stati does not compile TypeScript in templates, so type annotations or `as` casts are a syntax error. Templates read their data from `stati`, not Eta's usual `it`.

### Dynamic attribute values

> **Stati convention:** write each dynamic HTML attribute value as one expression, rather than splicing expressions into the middle of static text (for example `class="bg-<%= color %>-500"`). Eta itself renders spliced values, but one expression per attribute keeps values readable, and building class names with `stati.propValue()` records them in the Tailwind class inventory.

Use template literals (or `stati.propValue()`, described below) to make the entire attribute value dynamic:

```eta
<!-- ❌ Avoid: expression spliced into static text -->
<button class="bg-<%= color %>-500">Click me</button>

<!-- ✅ Preferred: one expression for the whole value -->
<button class="<%= `bg-${color}-500` %>">Click me</button>
```

For more complex combinations, prefer Stati's own `stati.propValue()`. It builds attribute values by accepting strings, arrays, or objects and works best for attributes that support space-separated tokens:

```eta
<a
  class="<%= stati.propValue('btn', `btn-${variant}`, isActive && 'is-active') %>"
  data-analytics="<%= stati.propValue('cta', campaign, isActive && 'active') %>"
>
  Learn more
</a>
```

`stati.propValue()` joins its strings and numbers, the truthy items of arrays, and the keys of objects whose values are truthy, with spaces, and skips falsy values (similar to `classnames`). For attributes that need a single concatenated string, use a template literal instead:

```eta
data-id="<%= `item-${id}` %>"
```

### Basic syntax

```eta
<!-- Variables -->
<h1><%= stati.page.title %></h1>
<p><%= stati.page.description %></p>

<!-- Raw HTML (unescaped) -->
<div><%~ stati.content %></div>

<!-- Conditionals -->
<% if (stati.page.author) { %>
  <p>Written by <%= stati.page.author %></p>
<% } else { %>
  <p>Author unknown</p>
<% } %>

<!-- Loops (collection entries keep front matter under frontMatter) -->
<ul>
<% (stati.collection?.pages || []).forEach(page => { %>
  <li><a href="<%= stati.url(page.url) %>"><%= page.frontMatter.title %></a></li>
<% }); %>
</ul>

<!-- Comments -->
<%/* This is a comment */%>
```

### Available data

In your templates, you have access to:

```eta
<!-- Page data -->
<%= stati.page.title %>     <!-- From front matter -->
<%= stati.page.description %> <!-- From front matter -->
<%~ stati.content %>        <!-- Rendered Markdown (HTML, so print it raw) -->
<%= stati.page.url %>       <!-- Current page URL -->
<%= stati.page.date %>      <!-- Page date (if specified) -->
<% stati.page.toc.forEach(entry => { %>  <!-- TOC entries (h2-h6) -->
  <a href="<%= `#${entry.id}` %>"><%= entry.text %></a>
<% }) %>

<!-- Site data -->
<%= stati.site.title %>     <!-- Site title from config -->
<%= stati.site.baseUrl %>   <!-- Site base URL -->
<%= stati.site.defaultLocale %> <!-- Default locale (optional) -->
<%= stati.site.description %> <!-- Default site description (optional) -->

<!-- Generator data -->
<%= stati.generator.version %> <!-- Stati core version -->

<!-- Page front matter data -->
<%= stati.page.layout %>    <!-- Layout name from front matter -->

<!-- Other templates and your own functions -->
<%~ stati.include('partials/header') %> <!-- Another template's HTML, printed raw -->
<%= stati.helpers.formatDate(stati.page.date) %> <!-- A function from helpers in the config -->

<!-- Images -->
<%~ stati.image(stati.page.cover, { alt: stati.page.coverAlt }) %> <!-- Sized, lazy-loaded image (HTML, so print it raw) -->
<%= stati.ogImage?.url %>   <!-- Generated Open Graph image, with images.og -->
```

`stati.image()` sizes an image from a layout, such as a post's cover, the way Stati sizes Markdown images. See [Images in templates](/configuration/images#images-in-templates) and the [Template API](/api/templates#stati-image-src-options).

The [Template API](/api/templates#template-context-stati) lists everything on `stati`.

## Layout system

### Section layouts

Stati supports hierarchical layouts where more specific layouts **override** parent directory layouts:

```text
site/
├── layout.eta           # Root layout (fallback for all pages)
└── blog/
    ├── layout.eta       # Blog layout (overrides root for /blog pages)
    ├── index.md
    └── posts/
        ├── layout.eta   # Post layout (overrides blog for /blog/posts pages)
        └── my-post.md
```

A section's layout replaces the root layout for the pages in its folder. The page around them, with the `<head>`, header and footer, can live in one shared template; see [Sharing a shell](#sharing-a-shell).

### Template resolution order

A page's layout is the template its front matter `layout` names, or else the nearest `layout.eta` from the page's folder up to `site/`: for `site/blog/tech/post.md`, `blog/tech/layout.eta`, then `blog/layout.eta`, then `layout.eta`. Without either, the build warns and writes the page with a bare fallback HTML document.

```yaml
---
# This overrides automatic template discovery
layout: 'article'
title: 'My Post'
---
```

The `layout` value is a template name without the `.eta` extension, looked up the same way as [`stati.include()`](#template-names): `layout: 'article'` uses the nearest `article.eta` from the page's folder up to `site/`, `layout: '/article'` uses `site/article.eta` only, and `layout: 'layouts/post'` uses the nearest `layouts/post.eta`. If no file matches, the build warns, suggests similar names, and uses the `layout.eta` lookup instead.

Index pages of a [collection](#collections) check for an `index.eta` in each folder before its `layout.eta`, so a listing can have its own layout while its posts keep the folder's. The later pages of a paginated listing use the same layout as the first. The root `index.md` is always an index page; a folder's `index.md` is one once the folder holds another page.

### Root layout example

On a site with one layout, `site/layout.eta` can be the whole page:

```eta
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en-US' %>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= stati.page.title ? `${stati.page.title} | ${stati.site.title}` : stati.site.title %></title>
    <% if (stati.page.description) { %>
    <meta name="description" content="<%= stati.page.description %>">
    <% } %>

    <!-- Favicon -->
    <link rel="icon" href="<%= stati.url('/favicon.svg') %>" type="image/svg+xml">

    <!-- Styles -->
    <link rel="stylesheet" href="<%= stati.url('/styles.css') %>">
</head>
<body>
    <%~ stati.include('partials/header') %>

    <main>
        <%~ stati.content %>
    </main>

    <%~ stati.include('partials/footer') %>
</body>
</html>
```

Stati's [SEO injection](/configuration/seo#automatic-seo-injection) adds the Open Graph, Twitter and canonical tags, so the layout doesn't write them.

### Sharing a shell

With more than one layout, keep the document around them in one template and let each layout name it with `stati.layout()`. The shell receives the layout's output as `stati.body`:

`site/base.eta`:

```eta
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en-US' %>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= stati.page.title ? `${stati.page.title} | ${stati.site.title}` : stati.site.title %></title>
    <link rel="stylesheet" href="<%= stati.url('/styles.css') %>">
</head>
<body class="<%= stati.propValue('site', stati.props?.bodyClass) %>">
    <%~ stati.include('partials/header') %>
    <%~ stati.body %>
    <%~ stati.include('partials/footer') %>
</body>
</html>
```

`site/layout.eta`:

```eta
<% stati.layout('base') %>
<main>
    <%~ stati.content %>
</main>
```

`site/blog/layout.eta`:

```eta
<% stati.layout('base', { bodyClass: 'blog' }) %>
<div class="blog-container">
    <aside class="blog-sidebar">
        <%~ stati.include('partials/blog-nav') %>
    </aside>

    <article class="blog-content">
        <header class="post-header">
            <h1><%= stati.page.title %></h1>
            <% if (stati.page.date) { %>
            <time datetime="<%= stati.page.date %>">
                <%= new Date(stati.page.date).toLocaleDateString() %>
            </time>
            <% } %>
        </header>

        <div class="prose">
            <%~ stati.content %>
        </div>
    </article>
</div>
```

**How it works:**

- `stati.layout(name, props?)` names the template that wraps the current one. It prints nothing and can be called anywhere in the template; the wrapping happens once the template has rendered.
- The named template receives that output as `stati.body`, printed raw with `<%~`, and the props as `stati.props`.
- A shell can call `stati.layout()` itself, so wrappers nest: `blog/layout.eta` can name `blog/base.eta`, which names `/base` for `site/base.eta`. A plain `'base'` there would find `blog/base.eta` itself, because names are looked up from the page's folder.
- Discovery only ever picks `layout.eta` and `index.eta`, so `base.eta` is never a page's layout by accident.
- `stati.body` exists only in templates rendered by `stati.layout()` or `stati.include()`. In the page's own layout, the page's Markdown is `stati.content`.
- One `stati.layout()` call per template. In development a second call is an error; in production the build warns and uses the last one. Choose the name with a condition instead, using `stati.layout.has()` for optional shells:

```eta
<% stati.layout(stati.layout.has('blog/base') ? 'blog/base' : 'base') %>
```

## Including templates

`stati.include(name, props?, body?)` renders another template and returns its HTML. Any `.eta` file under `site/` can be included. By convention, reusable pieces live in `site/partials/`; only Markdown files become pages, so a folder of templates adds no pages. Content discovery also skips folders starting with `_`, if you prefer to mark template folders that way.

```eta
<%~ stati.include('partials/header') %>
<%~ stati.include('partials/footer') %>
```

### Template names

`stati.include()`, `stati.layout()` and front matter `layout:` all take a template path without `.eta` (a `.eta` suffix is accepted and dropped):

| Name                        | Where Stati looks                                            |
| --------------------------- | ------------------------------------------------------------ |
| `header`, `partials/header` | From the page's folder up to `site/`; the nearest match wins |
| `/partials/header`          | In `site/` only                                              |
| `./icon`, `../icons/arrow`  | Relative to the template making the call                     |

A name never resolves outside `site/`. Because names are looked up from the page's folder, a section can replace a template for its own pages by putting one at the same path:

```text
site/
├── partials/
│   └── header.eta       # Used by every page...
└── blog/
    ├── partials/
    │   └── header.eta   # ...except the pages in blog/, which use this one
    └── post.md
```

The lookup follows the **page** being rendered, not the template making the call: for `site/blog/post.md`, `stati.include('partials/header')` in the root `site/base.eta` still finds `site/blog/partials/header.eta`. To pin a template regardless of the page, start the name with `/` or `./`.

### Passing props

The second argument is an object of props. Inside the included template, they are `stati.props`:

```eta
<!-- In a layout: one card per page of the collection -->
<div class="posts-grid">
  <% (stati.collection?.pages ?? []).forEach(post => { %>
    <%~ stati.include('partials/card', {
      title: post.frontMatter.title,
      description: post.frontMatter.description,
      url: post.url,
    }) %>
  <% }) %>
</div>
```

`site/partials/card.eta`:

```eta
<article class="card">
  <h3><a href="<%= stati.url(stati.props.url) %>"><%= stati.props.title %></a></h3>
  <% if (stati.props.description) { %>
    <p><%= stati.props.description %></p>
  <% } %>
</article>
```

**How it works:**

- A template renders only where it is included, with the props of that call.
- `stati.props` is `undefined` when an include passes none, so a template that works with and without props reads them as `stati.props?.name`.
- Everything else stays available inside: `stati.page`, `stati.site`, `stati.content`, `stati.helpers` and the rest.
- Props must be an object. Anything else is an error in development; in production the build warns and renders the template without them.

### Passing content

The third argument is HTML for the included template to wrap. It arrives as `stati.body`:

```eta
<%~ stati.include('partials/callout', { tone: 'warning' }, '<p>This page is a draft.</p>') %>

<!-- The content can be another include -->
<%~ stati.include('partials/callout', { tone: 'note' }, stati.include('partials/draft-notice')) %>
```

`site/partials/callout.eta`:

```eta
<aside class="<%= `callout callout-${stati.props.tone}` %>">
  <%~ stati.body %>
</aside>
```

A component can also name a frame with `stati.layout()`, the same way a layout names its shell. Each render has its own layout slot, so a component's `stati.layout()` never changes the page's layout.

### Optional templates

`stati.include.has(name)` tells whether a name resolves for the current page, using the same lookup as `stati.include()`:

```eta
<% if (stati.include.has('partials/banner')) { %>
  <%~ stati.include('partials/banner') %>
<% } %>
```

### Rendering rules

- Included templates render synchronously, so they cannot use `await`. Development shows an error that names the template.
- An include without props or content renders once per page. Including the same template again on that page reuses its HTML.
- A template that includes itself without props, directly or through other templates, is a cycle: development shows an error naming the chain (`site/layout.eta → site/partials/a.eta → site/partials/b.eta → site/partials/a.eta`), and production logs it and skips the repeat. With props, a template can include itself, for example to render a tree, up to a depth of 100.
- An unknown name opens the error overlay in development, with the paths of similar templates. In production the build logs the error and the include renders nothing.

Eta's own `include()`, `includeAsync()`, `layout()`, `block()` and `blockAsync()` are not available in Stati templates ([what each one does instead](/api/templates#eta-s-include-layout-and-block)). Use `stati.include()` and `stati.layout()`, and pass content a layout should place to it as props.

## Collections

A folder of pages with an `index.md` is a collection, which templates read as `stati.collection`: its pages, sorted by date and grouped by tag, for listings, tag clouds and prev/next links. Each entry is a page model, so read front matter through `post.frontMatter` and link with `post.url`. [Collections and generated pages](/core-concepts/collections) covers which collection a page reads, pagination and one page per tag.

## Helpers

Functions you call from several templates belong in `helpers` in `stati.config.ts`. Templates call them as `stati.helpers.name()`:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  helpers: {
    formatDate: (date: string | Date) =>
      new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    truncate: (text: string, length = 150) =>
      text.length <= length ? text : `${text.slice(0, length)}...`,
  },
});
```

```eta
<time><%= stati.helpers.formatDate(stati.page.date) %></time>
<p class="excerpt"><%= stati.helpers.truncate(stati.page.description ?? '') %></p>
```

Helpers are plain functions: they take arguments and return a value. Stati's own functions stay on `stati` itself: `stati.slugify()`, `stati.url()`, `stati.propValue()`, `stati.image()` and `stati.generateSEO()`. [Template configuration](/configuration/templates#helpers) covers `this`, errors and caching.

### Inline functions

A function only one template needs can live in that template:

```eta
<% const year = (date) => new Date(date).getFullYear(); %>
<p>Published in <%= year(stati.page.date) %></p>
```
