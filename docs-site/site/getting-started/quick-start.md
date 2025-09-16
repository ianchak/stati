---
title: 'Quick Start Guide'
description: 'Build your first Stati site step by step in just a few minutes.'
---

# Quick Start Guide

This guide will walk you through creating your first Stati site from scratch. You'll learn the basics of content creation, templating, and building.

## Prerequisites

Before we start, make sure you have:

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- A text editor (VS Code recommended)

## Step 1: Create a New Project

Use the Stati scaffolder to create a new project:

```bash
npx create-stati my-first-site
```

This will:

- Create a new directory called `my-first-site`
- Set up the basic project structure
- Install all necessary dependencies
- Initialize git repository (optional)

Navigate to your new project:

```bash
cd my-first-site
```

## Step 2: Explore the Project Structure

Your new project will have this structure:

```
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

This will:

- Start the development server (usually on http://localhost:3000)
- Watch for file changes
- Automatically reload the browser when you make changes

Open your browser and navigate to the URL shown in the terminal (typically http://localhost:3000).

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

- ⚡️ Lightning-fast development with Vite
- 🔧 TypeScript-first configuration
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

1. **TypeScript Support** - Full type safety out of the box
2. **Modern Tooling** - Built on Vite for excellent DX
3. **Flexible** - Powerful but not overwhelming
4. **Fast** - Incremental builds and smart caching

## Contact

Feel free to reach out if you have any questions!
```

Your new page will be available at http://localhost:3000/about/

## Step 6: Customize the Layout

Edit `site/layout.eta` to add navigation:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= it.title ? `${it.title} | ${it.site.title}` : it.site.title %></title>
    <meta name="description" content="<%= it.description || it.site.description %>" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/about/">About</a>
    </nav>

    <main>
      <% if (it.title) { %>
      <h1><%= it.title %></h1>
      <% } %> <%~ it.content %>
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

Edit `stati.config.js` to customize your site settings:

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

### Examples and Recipes

- [Blog Example](/examples/blog/)
- [Documentation Site](/examples/docs/)
- [Recipe Collection](/examples/recipes/)

## Need Help?

- Check the [API Reference](/api/) for detailed documentation
- Browse [Examples](/examples/) for inspiration
- Visit the [Contributing](/contributing/) section to help improve Stati

Congratulations! You've successfully created your first Stati site. Happy building! 🎉
