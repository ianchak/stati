---
title: 'Quick start'
description: 'Get up and running with Stati in minutes.'
order: 4
seo:
  title: 'Stati quick start'
---

# Quick start

This guide takes you from nothing to a running Stati site, then through the first changes you'll make: content, layout, styling, config and a production build.

## The short version

```bash
npx create-stati my-first-site
cd my-first-site
npm run dev
```

Press Enter to accept each default; the scaffolder installs dependencies for you. `npm run dev` then serves the site at [http://localhost:3000](http://localhost:3000) and reloads the browser whenever you make changes. The steps below explain each command.

## Prerequisites

- Node.js 22.20 or a later 22.x release, or 24 and later
- npm, pnpm, yarn or bun
- A text editor (VS Code recommended)

## Step 1: Create a new project

Use the Stati scaffolder to create a new project:

```bash
npx create-stati my-first-site
```

The scaffolder asks, in order:

- **Project name** - Skipped when you pass one, as above
- **Template** - Blank, a minimal starter; Blog, a complete blog with tag pages, an archive and an RSS feed; Docs, a complete documentation site with a sidebar, search and a table of contents; or News, a complete news site with sections, a ranked front page and author pages
- **CSS solution** - Plain CSS, Sass/SCSS, or Tailwind CSS
- **TypeScript** - On by default, for a typed `stati.config.ts` and client TypeScript bundles; answer no for JavaScript
- **Image tools** - Off by default; yes adds `@stati/images` for responsive images and link preview cards
- **Agent skill** - Optionally install the Stati skill for Claude Code or GitHub Copilot
- **Git** - Initialize a git repository (on by default)
- **Install dependencies** - Run the install for you (on by default)
- **Package manager** - npm, yarn, pnpm or bun, when more than one is installed

Navigate to your new project:

```bash
cd my-first-site
```

> **Note:** If you chose to install dependencies during scaffolding, they're already installed. Otherwise, run `npm install` before continuing.

## Step 2: Explore the project structure

Your new project will have this structure:

```text
my-first-site/
├── package.json          # Project dependencies and scripts
├── stati.config.ts       # Stati configuration (stati.config.js for JavaScript projects)
├── tsconfig.json         # TypeScript compiler configuration
├── src/
│   └── main.ts           # Client TypeScript entry point
├── public/               # Static assets
│   ├── favicon.svg
│   └── styles.css
└── site/                 # Your content and templates
    ├── index.md          # Homepage content
    └── layout.eta        # Page layout template
```

## Step 3: Start the development server

Start the development server to see your site:

```bash
npm run dev
```

The dev server will:

- Serve your site at [http://localhost:3000](http://localhost:3000) (configurable)
- Watch for file changes in `site/` and `public/`
- Automatically rebuild and reload the browser when you save changes

Open your browser and navigate to the URL shown in the terminal. Your site is running; the rest of this guide makes it yours.

<figure>

![The blank starter's homepage: a header with the site name, a large Welcome to your Stati site heading, and a numbered list of getting-started steps.](/images/blank-template-light.webp){.dark:hidden}
![The blank starter's homepage in its dark theme: a header with the site name, a large Welcome to your Stati site heading, and a numbered list of getting-started steps.](/images/blank-template-dark.webp){.hidden .dark:block}

<figcaption>The starter homepage. It follows the visitor&#39;s light or dark system setting.</figcaption>
</figure>

## Next: Make it yours

Work through these in order, or jump to the one you need.

### Step 4: Edit your first page

Open `site/index.md` in your text editor and modify it:

```markdown
---
title: 'Welcome to My Site'
description: 'My first Stati-powered website'
---

# Hello, Stati!

This is my first page built with Stati, a TypeScript-first static site generator.

## Features I Love

- Markdown-based content
- Flexible templating with Eta
- TypeScript-first configuration with IntelliSense
- Built-in esbuild compilation for client-side TypeScript
- Incremental Static Generation

Ready to build something amazing!
```

Save the file and watch your browser automatically refresh with the changes.

### Step 5: Add a new page

Create a new page by adding `site/about.md`:

```markdown
---
title: 'About Me'
description: 'Learn more about me and this site'
---

# About Me

Welcome to my personal website! I'm excited to be using Stati for this project.

## Why Stati?

I chose Stati because:

1. **TypeScript Support** - Full type safety for config plus built-in esbuild compilation for client-side code
2. **Modern Tooling** - esbuild-compiled client TypeScript, live reload, and automatic bundle injection
3. **Flexible** - Powerful but not overwhelming
4. **Smart Caching** - Incremental builds with intelligent caching

## Contact

Feel free to reach out if you have any questions!
```

Your new page will be available at [http://localhost:3000/about](http://localhost:3000/about)

### Step 6: Add the page to the navigation

`site/layout.eta` wraps every page. Its header already has a navigation with a Home link; add one for your About page:

```html
<nav aria-label="Main">
  <a href="/" aria-current="<%= stati.page.url === '/' ? 'page' : 'false' %>">Home</a>
  <a href="/about" aria-current="<%= stati.page.url === '/about' ? 'page' : 'false' %>">About</a>
</nav>
```

`aria-current="page"` tells screen readers which page is open, and the stylesheet highlights that link. The whole attribute value is one expression, following Stati's convention for dynamic attributes (see [Dynamic attribute values](/core-concepts/templates#dynamic-attribute-values)).

### Step 7: Change the colors

The colors and fonts are custom properties at the top of `public/styles.css`, with a second set for the dark theme. Change the accent in both to restyle links, focus rings and text selection across the site:

```css
:root {
  --accent: #0f766e;
  --accent-ink: #115e59;
}

@media (prefers-color-scheme: dark) {
  :root {
    --accent: #2dd4bf;
    --accent-ink: #5eead4;
  }
}
```

Edit the values in place rather than adding a second `:root` block. If you chose Sass, the same properties are in `src/styles.scss`, where `$primary-color` sets the light accent. With Tailwind, `src/styles.css` styles the starter with `@apply` and Tailwind's own palette, so swap the `blue-*` classes there instead.

### Step 8: Configure your site

Edit `stati.config.ts` (or `stati.config.js` for JavaScript projects) to customize your site settings:

```typescript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My First Stati Site',
    description: 'A modern static site built with Stati',
    baseUrl: 'https://my-site.com', // Your domain when deployed
  },

  // TypeScript projects: compile src/main.ts (keep this from the generated config)
  typescript: {
    enabled: true,
  },

  dev: {
    port: 3000,
    open: true,
  },

  // Generate sitemap.xml for search engines
  sitemap: {
    enabled: true,
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.5,
  },

  // Generate robots.txt
  robots: {
    enabled: true,
    sitemap: true, // Auto-include sitemap URL
  },
});
```

### Step 9: Build for production

When you're ready to deploy, build your site:

```bash
npm run build
```

This creates a `dist/` directory with your optimized site ready for deployment.

### Step 10: Deploy your site

You can deploy the `dist/` folder to any static hosting service:

- **Netlify**: Drag and drop the `dist/` folder
- **Vercel**: Import your GitHub repository
- **GitHub Pages**: Push the `dist/` contents to a `gh-pages` branch
- **Any web server**: Upload the `dist/` contents

## What's Next?

Now that you have a working Stati site, explore these topics:

### Learn core concepts

- [Filesystem-based Routing](/core-concepts/routing)
- [Templates & Layouts](/core-concepts/templates)
- [Markdown Pipeline](/core-concepts/markdown)
- [Incremental Static Generation](/core-concepts/isg)

### Advanced configuration

- [Site Metadata](/configuration/site-metadata)
- [Template Helpers](/configuration/templates)
- [Markdown Configuration](/configuration/markdown)

### Examples and learning resources

- [Available Examples](/examples/list) - Explore currently implemented templates
- [Configuration Reference](/configuration/file) - Detailed configuration options

## Need help?

- Check the [API overview](/api/reference) for detailed documentation
- Browse [Examples](/examples/list) for inspiration
- Visit the [Contributing](/advanced/contributing) section to help improve Stati
