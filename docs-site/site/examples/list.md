---
title: 'Example sites'
description: 'Learn Stati by exploring examples and getting started templates.'
order: 1
seo:
  title: 'Stati example sites'
---

# Example sites

Learn Stati by exploring examples and real-world implementations. Currently, Stati provides a minimal template with a clear structure for getting started.

## Available examples

### Blank template

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
npm install
npm run dev
```

## Creating your own

Use the scaffolder to create a new Stati project:

```bash
# Interactive setup
npm create stati my-site

# Available options:
# - Template: blank (only option currently)
# - Styling: CSS, Sass, or Tailwind CSS
# - Git initialization
# - Dependency installation (automatic or manual)
# - Package manager selection (npm, yarn, pnpm, bun)
```

### Manual setup

Create a minimal Stati site manually:

```bash
mkdir my-site && cd my-site
npm init -y
npm install --save-dev @stati/cli @stati/core

# Create basic structure
mkdir site public
echo '# Hello Stati' > site/index.md
```

Create `stati.config.js`:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
  },
});
```

## Learning resources

- **Getting started** - [/getting-started/installation](/getting-started/installation)
- **Configuration Reference** - [/configuration/file](/configuration/file)
- **CLI commands** - [/cli/commands](/cli/commands)

## Community examples

As the Stati community grows, we'll showcase community-built examples here.

## Development patterns

### Content organization

```text
site/
├── index.md              # Homepage
├── about.md              # About page
├── blog/                 # Blog section
│   ├── index.md          # Blog listing
│   └── first-post.md     # Blog post
└── layout.eta            # Site layout
```

### Template hierarchy

```text
site/
├── layout.eta            # Root layout
├── blog/
│   ├── layout.eta        # Blog-specific layout
│   └── post.md           # Uses blog layout
└── docs/
    ├── layout.eta        # Docs-specific layout
    └── guide.md          # Uses docs layout
```

## Need help?

- **Documentation** - Browse the full [Stati documentation](/)
- **GitHub Issues** - [Report bugs or request features](https://github.com/ianchak/stati/issues)
- **Discussions** - [Ask questions and share ideas](https://github.com/ianchak/stati/discussions)

Happy building with Stati!
