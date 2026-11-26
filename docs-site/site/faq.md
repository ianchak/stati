---
title: 'FAQ'
description: 'Frequently asked questions about Stati, the TypeScript-first static site generator.'
order: 99
seo:
  title: 'Stati FAQ'
  structuredData:
    "@context": "https://schema.org"
    "@type": "FAQPage"
    "mainEntity":
      - "@type": "Question"
        "name": "What is Stati?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Stati is a TypeScript-first static site generator for documentation, blogs, and content-heavy sites. It runs without a config file, bundles client-side TypeScript with esbuild, and turns the files in site/ into URLs."
      - "@type": "Question"
        "name": "Does Stati support Incremental Static Generation (ISG)?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Yes. ISG is enabled by default: Stati caches rendered pages between builds and re-renders only the pages whose content, templates, data they show or TTL require it. A listing rebuilds when a post it lists is added, removed or retitled, and a deleted page's HTML is removed. Configure TTLs and aging rules under isg, and clear entries with stati invalidate."
      - "@type": "Question"
        "name": "What templating engine does Stati use?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Stati uses Eta 4. Its templates get layouts chosen by folder, which replace the layouts above them, shared page shells, includes with props and a body, template helpers, and await in layouts and the shells they name."
      - "@type": "Question"
        "name": "How does Stati handle SEO?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Stati automatically injects SEO metadata during build: title and description from front matter, canonical URLs based on site.baseUrl, Open Graph and Twitter Card tags, and structured data (JSON-LD) from seo.structuredData. Sitemap generation with priority rules, robots.txt with a sitemap reference, and RSS feed generation are opt-in."
      - "@type": "Question"
        "name": "Can I use TypeScript in my Stati project?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Yes. Stati is TypeScript-first: configuration via stati.config.ts with full type safety, client-side TypeScript compiled with esbuild, and multiple bundle targets with include/exclude patterns."
---

# FAQ

## What is Stati?

Stati is a TypeScript-first static site generator for documentation, blogs, and content-heavy sites. It runs without a config file, bundles client-side TypeScript with esbuild, and turns the files in `site/` into URLs.

## Does Stati support Incremental Static Generation (ISG)?

Yes. ISG is enabled by default: Stati caches rendered pages between builds and re-renders only the pages whose content, templates, data they show or TTL require it. A listing rebuilds when a post it lists is added, removed or retitled, and a deleted page's HTML is removed. Configure TTLs and aging rules under `isg`, and clear entries with `stati invalidate`. See [ISG](/core-concepts/isg).

## Can Stati generate tag pages and paginated listings?

Yes. `paginate: 10` in a listing's front matter splits it into `/blog`, `/blog/page/2` and so on, and a `[tag].md` file with `generate: { from: tags }` in its front matter becomes one page per tag, such as `/blog/tags/css`. See [Collections and generated pages](/core-concepts/collections).

## What templating engine does Stati use?

Stati uses [Eta](https://eta.js.org/) 4. Its templates get:

- Layouts chosen by folder, which replace the layouts above them
- Shared page shells
- Includes with props and a body
- Template helpers
- `await` in layouts and the shells they name

## How does Stati handle SEO?

Stati automatically injects SEO metadata during build:

- Title and description from front matter
- Canonical URLs based on `site.baseUrl`
- Open Graph and Twitter Card tags
- Structured data (JSON-LD) from `seo.structuredData`

Opt-in, each with `enabled: true` in its config section:

- Sitemap generation with priority rules
- robots.txt with sitemap reference
- RSS feed generation

## Can I use TypeScript in my Stati project?

Yes. Stati is TypeScript-first:

- Configuration via `stati.config.ts` with full type safety
- Client-side TypeScript compiled with esbuild
- Multiple bundle targets with include/exclude patterns
