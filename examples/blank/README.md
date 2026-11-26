# Blank Stati Template

A minimal starter for [Stati](https://stati.build), the TypeScript-first static site generator.

## What's Included

- Basic HTML5 layout with semantic structure
- One small stylesheet with light and dark themes, driven by CSS custom properties
- Accessibility features (skip links, ARIA landmarks)
- SEO-friendly meta tags
- Single homepage to get you started

## Quick Start

1. Edit the homepage: `site/index.md`
2. Customize the layout: `site/layout.eta`
3. Add your styles: `public/styles.css` (`src/` with Sass or Tailwind)
4. Configure your site: `stati.config.js` (or `stati.config.ts` for TypeScript projects)

> **Tip:** `npx create-stati` creates TypeScript projects by default; pass `--no-typescript` for JavaScript.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the site for production
- `npm run preview` - Preview the built site
- `npm run clean` - Delete `dist/` and the `.stati/` cache

## Directory Structure

```
├── public/          # Static assets
│   ├── styles.css   # Main stylesheet (src/ with Sass or Tailwind)
│   └── favicon.svg  # Site icon
├── site/            # Content and templates
│   ├── layout.eta   # Main layout template
│   └── index.md     # Homepage content
├── src/main.ts      # Client-side TypeScript (not with --no-typescript)
├── stati.config.ts  # Stati configuration (stati.config.js with --no-typescript)
└── package.json     # Project configuration
```

## Next Steps

- Add pages as `.md` files in `site/`: `site/about.md` becomes `/about`
- Give a folder's pages their own layout with a `layout.eta` in that folder
- Move shared pieces such as the header into their own templates, for example `site/partials/header.eta`, and include them with `<%~ stati.include('partials/header') %>`
- List a folder's pages from its `index.md`, whose layout reads them as `stati.collection` (see [Collections](https://stati.build/core-concepts/collections))
- Write client-side code in `src/main.ts`, which Stati bundles for every page (see [TypeScript](https://stati.build/configuration/typescript))
