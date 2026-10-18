---
title: 'Example sites'
description: 'Learn Stati by exploring examples and getting started templates.'
order: 1
seo:
  title: 'Stati example sites'
---

# Example sites

Learn Stati by exploring examples and real-world implementations. Stati provides three starter templates: a minimal one for any kind of site, a complete blog, and a complete documentation site.

## Available examples

### Blank template

A minimal Stati site demonstrating core concepts:

- **Location:** [`examples/blank/`](https://github.com/ianchak/stati/tree/main/examples/blank)
- **Features:** A layout with header and footer, a homepage that walks you through the project, and one stylesheet with light and dark themes
- **Best for:** Getting started, understanding Stati fundamentals

<figure>

![The blank starter's homepage: a header with the site name, a large Welcome to your Stati site heading, and a numbered list of getting-started steps.](/images/blank-template-light.webp){.dark:hidden}
![The blank starter's homepage in its dark theme: a header with the site name, a large Welcome to your Stati site heading, and a numbered list of getting-started steps.](/images/blank-template-dark.webp){.hidden .dark:block}

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
- **Features:** Posts with tags, a page for every tag, a paginated home page, a yearly archive, newer, older and related posts, an RSS feed, a sitemap, `robots.txt`, Open Graph and Twitter tags, drafts and a 404 page. The sample posts explain how each part works.
- **Best for:** Starting a personal or team blog, and seeing collections, pagination and generated pages at work

<figure>

![The blog starter's homepage: the blog name and navigation, a large Hi, this is your new blog heading in a serif display face, and a dated list of posts with descriptions.](/images/blog-template-light.webp){.dark:hidden}
![The blog starter's homepage in its dark theme: the blog name and navigation, a large Hi, this is your new blog heading in a serif display face, and a dated list of posts with descriptions.](/images/blog-template-dark.webp){.hidden .dark:block}

<figcaption>The blog starter homepage, in the theme that matches your system setting.</figcaption>
</figure>

**Key Files:**

```text
examples/blog/
├── helpers/blog.js       # Template helpers for related posts and dates
├── site/
│   ├── partials/         # Head, header, footer, post lists, page links, tag links
│   ├── posts/            # One Markdown file per post, the archive and the post layout
│   ├── tags/             # The tags page and [tag].md, which makes a page per tag
│   ├── layout.eta        # Layout for home, archive, tags, about and 404
│   └── *.md              # Home, about and 404 pages
├── public/               # Styles, self-hosted font, ornament, sample image
└── stati.config.js       # Name, author, header links, feed, sitemap, SEO
```

**Start from it:**

```bash
npx create-stati my-blog --template=blog
```

### Docs template

A complete documentation site, ready to fill in:

- **Location:** [`examples/docs/`](https://github.com/ianchak/stati/tree/main/examples/docs)
- **Features:** A sidebar built from folders and front matter `order`, search with <kbd>Ctrl</kbd> <kbd>K</kbd>, an on-page table of contents, previous and next links, breadcrumbs, section overview pages, build-time syntax highlighting with copy buttons, light and dark themes, a mobile drawer, a sitemap, `robots.txt`, link previews and drafts. The sample pages explain how each part works.
- **Best for:** Documenting a library, CLI, API or product, and seeing how a hook and helpers build site-wide navigation

<figure>

![A page of the docs starter: a header with the site name, links, a search box and a theme toggle; a sidebar of sections with the current page highlighted; and the Sidebar and sections page with breadcrumbs, its title, a lead paragraph and a collapsible On this page list.](/images/docs-template-light.webp){.dark:hidden}
![The same docs starter page in its dark theme: a header with search and a theme toggle, a sidebar of sections, and the Sidebar and sections page with breadcrumbs, title and lead paragraph.](/images/docs-template-dark.webp){.hidden .dark:block}

<figcaption>A page of the docs starter, in the theme that matches your system setting.</figcaption>
</figure>

**Key Files:**

```text
examples/docs/
├── helpers/docs.js       # Sections, sidebar order, pager, breadcrumbs, SEO
├── site/
│   ├── partials/         # Head, header, sidebar, TOC, pager, search, footer, icons
│   ├── getting-started/  # One folder per section, with an index.md
│   ├── layout.eta        # Layout for docs pages, section overviews and 404
│   ├── home.eta          # Home page layout
│   └── index.md          # Home page
├── public/               # Styles, client script, self-hosted font, sample screenshot
└── stati.config.js       # Name, header links, search, sitemap, SEO
```

**Start from it:**

```bash
npx create-stati my-docs --template=docs
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
