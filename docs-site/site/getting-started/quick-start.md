---
title: 'Quick Start'
description: 'Get up and running with Stati in minutes.'
order: 4
---

# Quick Start Guide

This guide will walk you through creating your first Stati site from scratch. You'll learn the basics of content creation, templating, and building.

## Need Help?

- Check the [API Reference](/api/reference/) for detailed documentation
- Browse [Examples](/examples/list/) for inspiration
- Visit the [Contributing](/advanced/contributing/) section to help improve Stati

Before we start, make sure you have:

## Prerequisites

- Node.js 22+
- npm 11.5.1 or higher
- A text editor (VS Code recommended)

## Step 1: Create a New Project

Use the Stati scaffolder to create a new project:

```bash
npx create-stati my-first-site
```

This will:

- Create a new directory called `my-first-site`
- Copy the blank starter template into that directory
- Prepare `package.json` with Stati scripts and metadata
- Offer to initialize a git repository if you enable it during the prompt

Navigate to your new project:

```bash
cd my-first-site
```

> **Note:** If you chose to install dependencies during scaffolding, they're already installed. Otherwise, run `npm install` before continuing.

## Step 2: Explore the Project Structure

Your new project will have this structure:

```text
my-first-site/
├── package.json          # Project dependencies and scripts
├── stati.config.js       # Stati configuration
├── public/               # Static assets
│   ├── favicon.svg
│   └── styles.css
└── site/                 # Your content and templates
    ├── index.md          # Homepage content
    ├── layout.eta        # Base layout template
    └── _partials/        # Reusable template parts
```

## Step 3: Start the Development Server

Start the development server to see your site:

```bash
npm run dev
```

- Start the development server (usually on [http://localhost:3000](http://localhost:3000))
- Watch for file changes
- Automatically reload the browser when you make changes

Open your browser and navigate to the URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

## Step 4: Edit Your First Page

Open `site/index.md` in your text editor and modify it:

```markdown
---
title: 'Welcome to My Site'
description: 'My first Stati-powered website'
---

# Hello, Stati!

This is my first page built with Stati, a TypeScript-first static site generator.

## Features I Love

- ⚡️ Lightning-fast development with esbuild
- 🔧 TypeScript-first configuration with IntelliSense
- 📦 Built-in TypeScript compilation for client-side code
- 📝 Markdown-based content
- 🎨 Flexible templating with Eta
- 🚀 Incremental Static Generation

Ready to build something amazing!
```

Save the file and watch your browser automatically refresh with the changes.

## Step 5: Add a New Page

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
2. **Modern Tooling** - Lightning-fast builds with esbuild, hot reload, and automatic bundle injection
3. **Flexible** - Powerful but not overwhelming
4. **Smart Caching** - Incremental builds with intelligent caching

## Contact

Feel free to reach out if you have any questions!
```

Your new page will be available at [http://localhost:3000/about/](http://localhost:3000/about/)

## Step 6: Customize the Layout

Edit `site/layout.eta` to add navigation:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= stati.page.title ? `${stati.page.title} | ${stati.site.title}` : stati.site.title %></title>
    <% if (stati.page.description) { %>
    <meta name="description" content="<%= stati.page.description %>" />
    <% } %>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/about/">About</a>
    </nav>

    <main>
      <% if (stati.page.title) { %>
      <h1><%= stati.page.title %></h1>
      <% } %> <%~ stati.content %>
    </main>

    <footer>
      <p>&copy; 2024 My Stati Site</p>
    </footer>
  </body>
</html>
```

## Step 7: Add Some Styling

Edit `public/styles.css` to style your site:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  color: #333;
}

nav {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

nav a {
  margin-right: 1rem;
  text-decoration: none;
  color: #0066cc;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

main {
  margin-bottom: 3rem;
}

footer {
  text-align: center;
  color: #666;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}
```

## Step 8: Configure Your Site

Edit `stati.config.js` (or `stati.config.ts` for TypeScript projects) to customize your site settings:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My First Stati Site',
    description: 'A modern static site built with Stati',
    baseUrl: 'https://my-site.com', // Your domain when deployed
  },

  // Enable development features
  dev: {
    port: 3000,
    open: true,
  },

  // Markdown configuration
  markdown: {
    options: {
      linkify: true,
      typographer: true,
    },
  },
});
```

## Step 9: Build for Production

When you're ready to deploy, build your site:

```bash
npm run build
```

This creates a `dist/` directory with your optimized site ready for deployment.

## Step 10: Deploy Your Site

You can deploy the `dist/` folder to any static hosting service:

- **Netlify**: Drag and drop the `dist/` folder
- **Vercel**: Import your GitHub repository
- **GitHub Pages**: Push the `dist/` contents to a `gh-pages` branch
- **Any web server**: Upload the `dist/` contents

## What's Next?

Now that you have a working Stati site, explore these topics:

### Learn Core Concepts

- [Filesystem-based Routing](/core-concepts/routing/)
- [Templates & Layouts](/core-concepts/templates/)
- [Markdown Pipeline](/core-concepts/markdown/)
- [Incremental Static Generation](/core-concepts/isg/)

### Advanced Configuration

- [Site Metadata](/configuration/site-metadata/)
- [Template Settings](/configuration/templates/)
- [Markdown Configuration](/configuration/markdown/)

### Examples and Learning Resources

- [Available Examples](/examples/list/) - Explore currently implemented templates
- [Configuration Reference](/configuration/file/) - Detailed configuration options

## Need Help?

- Check the [API Reference](/api/reference/) for detailed documentation
- Browse [Examples](/examples/list/) for inspiration
- Visit the [Contributing](/advanced/contributing/) section to help improve Stati

Congratulations! You've successfully created your first Stati site. Happy building! 🎉
