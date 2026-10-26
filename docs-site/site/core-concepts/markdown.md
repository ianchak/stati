---
title: 'Markdown pipeline'
description: 'Learn how Stati processes and renders Markdown content with advanced features.'
order: 5
---

# Markdown pipeline

Stati renders Markdown with [markdown-it](https://github.com/markdown-it/markdown-it). On top of it, Stati adds heading anchors, a table of contents and image sizes; other syntax comes from markdown-it plugins you install. The options are on [Markdown configuration](/configuration/markdown).

## Core features

markdown-it follows CommonMark and adds tables and strikethrough (`~~text~~`). Stati also turns on raw HTML in Markdown, linkify and typographer.

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
difficulty: 'advanced'
estimatedTime: '30 minutes'
lastModified: '2024-01-15'
---

# Your content starts here...
````

YAML reads `title: 1984`, `tags: [2024]` and `title: 2024-01-01` as a number, a list with a number and a date. Stati uses the text you wrote for `title`, `description`, `tags`, `seo.title`, `seo.description` and `seo.keywords` (a date as `2024-01-01`), so such values need no quotes. A `null` entry in `tags` or `seo.keywords` (`tags: [~]`) is dropped, with a warning that names the file.

Stati reads fields such as `title`, `description`, `tags`, `layout`, `date`, `order` and `draft`. Any other field, such as `difficulty` above, is available in templates as `stati.page.*`:

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

### Syntax highlighting

Code blocks in markdown are rendered with language class attributes, without highlighting:

```html
<!-- Rendered output for code blocks -->
<pre><code class="language-typescript">
// Your code here
</code></pre>
```

To highlight code, either add the `markdown-it-prism` plugin, which highlights at build time with no browser JavaScript (see [Syntax highlighting](/configuration/markdown#syntax-highlighting)), or load a client-side library that picks up the `language-*` classes.

## Enhanced features

### Images

Stati reads the size of each Markdown image and writes it into the HTML. Images load lazily, except the page's first image when it sits near the top, which loads eagerly with a high fetch priority (`images.eagerFirst: false` turns that off):

```markdown
![Harbour at dawn](/images/harbour.jpg)
![Map of the route](./map.png)
```

```html
<img src="/images/harbour.jpg" alt="Harbour at dawn" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async">
```

A path that starts with `/` is read from `public/`. A relative path is read next to the page's Markdown file, and Stati copies that image to `/_img/`. With the optional `@stati/images` package, images can also get responsive AVIF and WebP versions. See [Images](/configuration/images) for the details and for turning this off.

### Task lists

Task list syntax (`- [x] Done`) is **not** supported out of the box: markdown-it renders the brackets as text. Add a markdown-it task-list plugin through `markdown.plugins` or `configure` if you need checkboxes.

### Auto-linking

URLs with a scheme (`https://stati.build`) are converted to links, and so is text shaped like an email address (`hello@stati.build`), whatever its domain. Domains without a scheme, such as `stati.build` or `www.example.com`, stay plain text. Write package versions such as `react@18.3.1` in backticks, or they become `mailto:` links; [Links](/configuration/markdown#links) lists the options. Write a Markdown link when in doubt:

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

## Configuration

Plugins, the markdown-it instance (`markdown.configure`) and the table of contents (`markdown.toc`) are set in `stati.config.ts`. See [Markdown configuration](/configuration/markdown).

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

### Word count and reading time

Stati counts the words of every page and works out how long it takes to read, so templates and listings need no hook for it:

| Field | Value |
| --- | --- |
| `wordCount` | The number of words in the Markdown body |
| `readingTime` | Minutes to read, as a whole number of at least 1 |

Both are set when the content is loaded, so `beforeAll` hooks can read them on `ctx.pages`. Templates read them as `stati.page.wordCount` and `stati.page.readingTime` for the current page, and as `post.wordCount` and `post.readingTime` on the pages of `stati.collection`:

```eta
<p class="meta"><%= stati.page.readingTime %> min read, <%= stati.page.wordCount %> words</p>

<% for (const post of stati.collection?.recentPages ?? []) { %>
  <li><%= post.frontMatter.title %> (<%= post.readingTime %> min read)</li>
<% } %>
```

The count covers the text a reader sees. Front matter, fenced code blocks, HTML tags, images and Markdown syntax do not count; link text and inline code do. Words are the runs of text between whitespace. Chinese and Japanese text has no spaces between words, so each Han, Hiragana and Katakana character counts as one word, and the count is approximate for those languages. Other scripts written without spaces, such as Thai, are not split and count low. Indented code blocks and the contents of `<script>` and `<style>` tags count as text. Korean is split on spaces, like other alphabets.

The reading time is the word count divided by `readingTime.wordsPerMinute` (230 unless you [set it](/configuration/file#reading-time-configuration)), rounded to the nearest minute. `wordCount` and `readingTime` are properties of Stati's page, so front matter keys of those names are replaced, with a warning.

A listing that shows `post.readingTime` or `post.wordCount` rebuilds when they change only if you add them to [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing). A `beforeAll` hook that changes `page.content` does not change the counts, which are taken when the page is loaded. Pages a hook adds get theirs after the hook runs.

### Content excerpts

Stati has no excerpt feature. Write one in front matter (`excerpt: 'A short summary.'`) and print it as `stati.page.excerpt` on the page or `post.frontMatter.excerpt` in a listing. Add `excerpt` to [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing) so listings rebuild when it changes.

Next, learn about [Incremental Static Generation](/core-concepts/isg) to understand how Stati handles caching and rebuilds.
