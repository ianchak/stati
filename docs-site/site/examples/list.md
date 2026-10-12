---
title: 'Example sites'
description: 'Learn Stati by exploring examples and getting started templates.'
order: 1
seo:
  title: 'Stati example sites'
---

# Example sites

Learn Stati by exploring examples and real-world implementations. Stati provides two starter templates: a minimal one for any kind of site, and a complete blog.

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

### Blog template

A complete blog, ready to write in:

- **Location:** [`examples/blog/`](https://github.com/ianchak/stati/tree/main/examples/blog)
- **Features:** Posts with tags, a yearly archive, newer, older and related posts, an RSS feed, a sitemap, `robots.txt`, Open Graph and `BlogPosting` metadata, drafts and a 404 page. The sample posts explain how each part works.
- **Best for:** Starting a personal or team blog, and seeing how hooks and filters share data across pages

<figure>
  <img class="dark:hidden" src="/images/blog-template-light.webp" alt="The blog starter's homepage: the blog name and navigation, a large Hi, this is your new blog heading in a serif display face, and a dated list of posts with descriptions." width="1120" height="716" loading="lazy" />
  <img class="hidden dark:block" src="/images/blog-template-dark.webp" alt="The blog starter's homepage in its dark theme: the blog name and navigation, a large Hi, this is your new blog heading in a serif display face, and a dated list of posts with descriptions." width="1120" height="716" loading="lazy" />
  <figcaption>The blog starter homepage, in the theme that matches your system setting.</figcaption>
</figure>

**Key Files:**

```text
examples/blog/
├── helpers/blog.js       # Post index, listing filters and article SEO
├── site/
│   ├── _partials/        # Head, header, footer, post lists, tag links
│   ├── posts/            # One Markdown file per post, plus the post layout
│   ├── layout.eta        # Layout for home, archive, tags, about and 404
│   └── *.md              # Home, archive, tags, about and 404 pages
├── public/               # Styles, self-hosted font, ornament, social card
└── stati.config.js       # Name, author, header links, feed, sitemap, SEO
```

**Start from it:**

```bash
npx create-stati my-blog --template=blog
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
