---
title: 'Installation'
description: 'How to install Stati and create your first project.'
order: 2
---

# Installation

## Prerequisites

- **Node.js** 22.20 or later on the 22.x line, or 24 and later
- **A package manager**: npm, pnpm, yarn or bun

## Scaffolder

```bash
npx create-stati
```

The scaffolder asks for a project name, a template (`blank`, `blog`, `docs` or `news`), the styling (plain CSS, Sass or Tailwind CSS), TypeScript (on by default), image tools (off by default), where to install the Stati agent skill, Git and dependency installation. A flag such as `--styling tailwind` answers its prompt in advance. [Scaffolder](/cli/scaffolder) lists every prompt and flag, and how to run without prompts.

A TypeScript project gets `stati.config.ts`, `tsconfig.json` and `src/main.ts`, the client entry point Stati compiles with esbuild; `npm run typecheck` checks it. Pass `--no-typescript` for a JavaScript project with `stati.config.js`. See [TypeScript](/configuration/typescript).

## Manual installation

If you prefer to set up Stati manually:

```bash
# Create a new directory
mkdir my-stati-site
cd my-stati-site

# Initialize npm as an ES module package
npm init -y
npm pkg set type=module

# Install Stati
npm install --save-dev @stati/cli @stati/core

# Create basic structure
mkdir site public
echo '# Hello Stati' > site/index.md
```

Create `site/layout.eta`, the layout every page uses:

```eta
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title><%= stati.page.title || stati.site.title %></title>
  </head>
  <body>
    <main><%~ stati.content %></main>
  </body>
</html>
```

Create a `stati.config.js` file:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
  },
});
```

Add scripts to your `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview"
  }
}
```

### Optional: image tools

Stati sizes and lazy-loads Markdown images without extra packages. For responsive AVIF and WebP images and an Open Graph image for every page, install `@stati/images` and turn the features on in your config:

```bash
npm install --save-dev @stati/images
```

See [Images](/configuration/images) for the options.

## Verification

To verify your installation works:

```bash
# Start the development server
npm run dev

# Build the site
npm run build

# Preview the built site
npm run preview
```

The development server runs at `http://localhost:3000` and the preview server at `http://localhost:4000`.
