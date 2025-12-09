---
title: 'Stati FAQ'
description: 'Frequently asked questions about Stati, the TypeScript-first static site generator.'
order: 99
seo:
  structuredData:
    "@context": "https://schema.org"
    "@type": "FAQPage"
    "mainEntity":
      - "@type": "Question"
        "name": "What is Stati?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Stati is a TypeScript-first static site generator for documentation, blogs, and content-heavy sites, with zero-config setup, fast esbuild bundling, and file-based routing."
      - "@type": "Question"
        "name": "Does Stati support Incremental Static Generation (ISG)?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Yes. Stati includes built-in ISG so you can update specific pages without running a full rebuild. It uses intelligent caching with configurable TTL and invalidation strategies."
      - "@type": "Question"
        "name": "What templating engine does Stati use?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Stati uses Eta, a fast and lightweight templating engine. Eta supports layouts, partials, filters, and async rendering."
      - "@type": "Question"
        "name": "How does Stati handle SEO?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Stati automatically injects SEO metadata including title, description, canonical URLs, Open Graph tags, and Twitter Cards. You can also use the generateSEO() helper for manual control."
      - "@type": "Question"
        "name": "Can I use TypeScript in my Stati project?"
        "acceptedAnswer":
          "@type": "Answer"
          "text": "Yes. Stati is TypeScript-first. Your configuration file (stati.config.ts) is written in TypeScript, and client-side TypeScript is compiled automatically via esbuild."
---

# Stati FAQ

Frequently asked questions about Stati, the TypeScript-first static site generator.

## What is Stati?

Stati is a TypeScript-first static site generator for documentation, blogs, and content-heavy sites, with zero-config setup, fast esbuild bundling, and file-based routing.

## When should I choose Stati over other static site generators?

Choose Stati if you want:

- **Type safety** – TypeScript config, client-side bundling with esbuild, and full IntelliSense
- **Minimal footprint** – No heavy frameworks or unnecessary abstractions
- **Incremental builds** – ISG support for efficient rebuilds on large sites
- **Built-in SEO** – Automatic metadata injection, with opt-in sitemap and robots.txt generation

## Does Stati support Incremental Static Generation (ISG)?

Yes. Stati includes built-in ISG so you can update specific pages without running a full rebuild. Configure `isg.enabled: true` in your config, and Stati will cache rendered pages with configurable TTL and smart invalidation.

## What templating engine does Stati use?

Stati uses [Eta](https://eta.js.org/), a fast and lightweight templating engine. Features include:

- Layout inheritance
- Reusable partials
- Custom filters
- Async rendering support

## How does Stati handle SEO?

Stati automatically injects SEO metadata during build:

- Title and description from frontmatter
- Canonical URLs based on `site.baseUrl`
- Open Graph and Twitter Card tags
- Structured data (JSON-LD) from `seo.structuredData`

Opt-in features with simple config:

- Sitemap generation with priority rules
- robots.txt with sitemap reference
- RSS feed generation

## Can I use TypeScript in my Stati project?

Yes. Stati is TypeScript-first:

- Configuration via `stati.config.ts` with full type safety
- Client-side TypeScript compiled with esbuild
- Multiple bundle targets with include/exclude patterns

## Related Resources

- [Glossary](/glossary/) – Definitions of key terms used in Stati
- [Core Concepts](/core-concepts/overview/) – Deep dive into Stati's architecture
- [Configuration](/configuration/file/) – Full configuration reference
