---
title: 'Examples & Templates'
description: 'Explore Stati examples and learn from real-world implementations.'
---

# Examples & Templates

Learn Stati by exploring examples and real-world implementations. Currently, Stati provides a minimal template with plans for more comprehensive examples.

## Available Examples

### Blank Template

A minimal Stati site demonstrating core concepts:

- **Location:** [`examples/blank/`](https://github.com/ianchak/stati/tree/main/examples/blank)
- **Features:** Basic site structure, simple layout, example content
- **Best for:** Getting started, understanding Stati fundamentals

**Key Files:**

```text
examples/blank/
├── site/
│   ├── index.md          # Homepage with front-matter
│   └── layout.eta        # Main layout template
├── public/
│   ├── styles.css        # Basic styling
│   └── favicon.svg       # Site icon
├── stati.config.js       # Configuration example
└── package.json          # Scripts and dependencies
```

**Try it locally:**

```bash
# Clone the Stati repository
git clone https://github.com/ianchak/stati.git
cd stati

# Install dependencies and build
npm install
npm run build

# Run the blank example
cd examples/blank
npm run dev
```

## Creating Your Own

Use the scaffolder to create a new Stati project:

```bash
# Interactive setup
npm create stati my-site

# Available options:
# - Template: blank (only option currently)
# - Styling: CSS, Sass, or Tailwind CSS
# - Git initialization
```

### Additional Examples (Coming Soon)

The Stati repository includes placeholder directories for future examples:

- `examples/blog/` - Blog template (planned)
- `examples/docs/` - Documentation site template (planned)
- `examples/news/` - News site template (planned)

These directories currently contain only README files and are not yet implemented. Check back for updates!

## Learning Resources

### Core Concepts Examples

**Front-matter Usage:**

```markdown
---
title: 'My Page Title'
description: 'Page description for SEO'
date: 2024-01-15
tags: ['example', 'tutorial']
draft: false
---

# My Page Content

Regular Markdown content here.
```

**Layout Templates:**

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html lang="<%= it.site.defaultLocale || 'en' %>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= it.title %> - <%= it.site.title %></title>
  <% if (it.description) { %>
  <meta name="description" content="<%= it.description %>">
  <% } %>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <%~ it.content %>
</body>
</html>
```

**Configuration Example:**

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US',
  },
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  // ISG configuration
  isg: {
    enabled: true,
    ttlSeconds: 21600, // 6 hours
  },

  // Markdown configuration
  markdown: {
    plugins: ['anchor', 'toc-done-right'],
  },
});
```

## Community Examples

We encourage the community to share Stati implementations:

- **Submit examples** via GitHub issues or discussions
- **Share on social media** with #Stati hashtag
- **Contribute templates** to the main repository

## Development Patterns

### Common File Structure

```text
my-stati-site/
├── site/              # Content and templates
│   ├── *.md          # Markdown pages
│   ├── layout.eta    # Main layout
│   └── _partials/    # Reusable components
├── public/           # Static assets
├── stati.config.js   # Configuration
└── dist/            # Built site (generated)
```

### Build Scripts

```json
{
  "scripts": {
    "dev": "stati dev",           // Development server
    "build": "stati build",       // Production build
    "preview": "stati preview",   // Preview built site
    "clean": "rimraf dist .stati" // Clean build artifacts
  }
}
```

## Need Help?

- Check the [Configuration Guide](/configuration/) for setup options
- Visit [Core Concepts](/core-concepts/) for Stati fundamentals
- Explore the [CLI Commands](/cli/) for build and development tools
- Join our [GitHub Discussions](https://github.com/ianchak/stati/discussions) for community support

More examples and templates are coming soon. Stay tuned for blog, documentation, and news site templates!

## Need Help?

- Check the [Configuration Guide](/configuration/) for setup options
- Visit [Core Concepts](/core-concepts/) for Stati fundamentals
- Explore the [CLI Commands](/cli/) for build and development tools
- Join our [GitHub Discussions](https://github.com/ianchak/stati/discussions) for community support

More examples and templates are coming soon. Stay tuned for blog, documentation, and news site templates!
