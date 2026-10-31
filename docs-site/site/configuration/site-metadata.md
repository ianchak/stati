---
title: 'Site metadata'
description: 'Configure site title, URL, and SEO metadata for your Stati site.'
order: 2
seo:
  title: 'Site metadata configuration'
---

# Site metadata

The `site` block holds the site's title, address, language and description.

## Site configuration

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US', // Optional
    description: 'A modern static site built with Stati', // Optional
  },
});
```

### Available properties

#### `title` (required)

The site's title, used in templates and metadata. Access it in templates:

```eta
<title><%= stati.page.title %> | <%= stati.site.title %></title>
```

#### `baseUrl` (required)

Base URL for the site, used for absolute URL generation, sitemaps, and canonical links.

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://mysite.com',
  },
});
```

Leave the trailing slash off: Stati's own URLs work either way, but a template that joins `stati.site.baseUrl + stati.page.url` would get a double slash.

A `baseUrl` can carry a path, such as `https://example.com/docs` or `https://user.github.io/repo`. The path is the site's **base path**: Stati builds the site for that subfolder, adding it to the root-relative URLs it writes, and `stati dev` and `stati preview` serve the site under it. Without a path in `baseUrl` nothing changes. Templates add the base path to their own links with [`stati.url()`](/api/templates#stati-url-path). See [Deploying to a subfolder](/advanced/deploying-to-a-subfolder).

#### `defaultLocale` (optional)

The site's language, as a BCP 47 tag such as `en-US`: the form `<html lang>` needs. Stati prints it as `og:locale` on every page whose front matter sets no `seo.openGraph.locale`, converted to Open Graph's `language_TERRITORY` form (`en-US` becomes `en_US`).

```javascript
export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US',
  },
});
```

Common locale formats:

- `'en-US'` - English (United States), `og:locale` `en_US`
- `'en-GB'` - English (United Kingdom), `og:locale` `en_GB`
- `'es-ES'` - Spanish (Spain), `og:locale` `es_ES`
- `'fr-FR'` - French (France), `og:locale` `fr_FR`
- `'de-DE'` - German (Germany), `og:locale` `de_DE`

A script subtag is dropped (`zh-Hant-TW` becomes `zh_TW`). A tag without a region, such as `'en'`, has no Open Graph form, so no `og:locale` is printed; with `seo.debug` on, Stati warns about it. See [site-wide SEO defaults](/configuration/seo#locale).

#### `description` (optional)

Default site description used as a fallback for meta tags when a page doesn't have its own description. It is the last fallback in the description chain:

1. Page front matter `seo.description`
2. Page front matter `description`
3. Site config `description` (this field)

The site description appears in:

- `<meta name="description">` tag
- `<meta property="og:description">` (Open Graph)
- `<meta name="twitter:description">` (Twitter Cards)

## Author and SEO tags

The default author is `seo.defaultAuthor`, not part of `site`. Each page's SEO tags come from its front matter and the `seo` config. See [SEO](/configuration/seo), including its [site-wide defaults](/configuration/seo#site-wide-defaults).

## Template usage

Access site configuration in Eta templates:

```eta
<!-- Site title -->
<title><%= stati.page.title %> | <%= stati.site.title %></title>

<!-- Base URL for absolute links -->
<link rel="canonical" href="<%= stati.site.baseUrl + stati.page.url %>" />

<!-- Locale -->
<html lang="<%= stati.site.defaultLocale || 'en' %>">

<!-- Author from the page's seo front matter (if set) -->
<% const author = stati.page.seo?.author; %>
<% if (author) { %>
  <meta name="author" content="<%= typeof author === 'string' ? author : author.name %>" />
<% } %>
```

The config's `seo.defaultAuthor` is not part of the template context; auto-injection uses it when a page has no `seo.author`.

## Environment-specific configuration

Configure different metadata for different environments. `getEnv()` from `@stati/core` returns `'production'` during `stati build` and `stati preview`, and `'development'` during `stati dev`:

```javascript
import { defineConfig, getEnv } from '@stati/core';

const isProd = getEnv() === 'production';

export default defineConfig({
  site: {
    title: 'My Site',
    baseUrl: isProd ? 'https://mysite.com' : 'http://localhost:3000',
    defaultLocale: 'en-US',
  },
  seo: {
    // Log SEO warnings while developing
    debug: !isProd,
  },
});
```

Stati does not set `process.env.NODE_ENV`; if your config reads it, set it in your scripts yourself (for example `NODE_ENV=production stati build`).

## Metadata validation

Test your metadata with external validation tools:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

## Related configuration

- [SEO Configuration](/configuration/seo) - Complete SEO setup including Open Graph and Twitter Cards
- [RSS Configuration](/configuration/rss) - RSS feed generation
- [Sitemap Configuration](/configuration/seo#sitemap-configuration) - XML sitemap generation
- [Template context](/api/templates#template-context-stati) - `stati.site` and `stati.page` in templates
