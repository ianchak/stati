# Blank Stati Template

A minimal starter template for [Stati](https://github.com/ianchak/stati) static site generator.

## What's Included

- Basic HTML5 layout with semantic structure
- Minimal CSS reset and typography
- Accessibility features (skip links, ARIA landmarks)
- SEO-friendly meta tags
- Single homepage to get you started

## Quick Start

1. Edit the homepage: `site/index.md`
2. Customize the layout: `site/layout.eta`
3. Add your styles: `public/styles.css`
4. Configure your site: `stati.config.js`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the site for production
- `npm run preview` - Preview the built site
- `npm run clean` - Clean build artifacts

## Directory Structure

```
├── public/          # Static assets
│   ├── styles.css   # Main stylesheet
│   └── favicon.svg  # Site icon
├── site/            # Content and templates
│   ├── layout.eta   # Main layout template
│   └── index.md     # Homepage content
├── stati.config.js  # Stati configuration
└── package.json     # Project configuration
```

## Next Steps

- Add more pages by creating `.md` files in the `site/` directory
- Create additional layouts in `site/` for different page types
- Add collections for blog posts or documentation
- Customize the CSS or switch to Sass/Tailwind

Happy building with Stati!
