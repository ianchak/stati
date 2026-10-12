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
- **Features:** A layout with header and footer, a homepage that walks you through the project, and one stylesheet with light and dark themes
- **Best for:** Getting started, understanding Stati fundamentals

<figure>
  <img class="dark:hidden" src="/images/blank-template-light.webp" alt="The blank starter's homepage: a header with the site name, a large Welcome to your Stati site heading, and a numbered list of getting-started steps." width="1120" height="716" loading="lazy" />
  <img class="hidden dark:block" src="/images/blank-template-dark.webp" alt="The blank starter's homepage in its dark theme: a header with the site name, a large Welcome to your Stati site heading, and a numbered list of getting-started steps." width="1120" height="716" loading="lazy" />
  <figcaption>The blank starter homepage, in the theme that matches your system setting.</figcaption>
</figure>

**Key Files:**

```text
examples/blank/
├── site/
│   ├── index.md          # Homepage with front-matter
│   └── layout.eta        # Main layout template
├── public/
│   ├── styles.css        # Light and dark theme from CSS custom properties
│   └── favicon.svg       # Site icon
├── stati.config.js       # Configuration example
└── package.json          # Scripts and dependencies
```

**Start from it:**

The scaffolder copies this template into a new project:

```bash
npx create-stati my-site
```

The [quick start](/getting-started/quick-start) walks through the prompts and the first edits. To set up a project without the scaffolder, see [Manual installation](/getting-started/installation#manual-installation).

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
