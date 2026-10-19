---
title: 'Scaffolder'
description: 'Interactive scaffolding tool to quickly set up new Stati projects.'
order: 2
seo:
  title: 'Scaffolder (create-stati)'
---

# Scaffolder

The `create-stati` package provides an interactive scaffolding tool to quickly set up new Stati projects with styling options.

## Quick start

```bash
# Interactive setup
npx create-stati my-site

# Skip the template and styling prompts
npx create-stati my-site --template=blank --styling=tailwind

# A ready-to-write blog
npx create-stati my-blog --template=blog

# A complete documentation site
npx create-stati my-docs --template=docs

# JavaScript instead of TypeScript
npx create-stati my-site --no-typescript
```

> **Using `npm create`:** `npm create stati my-site` works too, but npm keeps any `--option` that comes before a `--` separator for itself, so the scaffolder never sees it. Put the scaffolder's options after `--`: `npm create stati my-site -- --template=blog`. `npx create-stati` passes options through as written.

Running the scaffolder will:

- Create a new project directory
- Copy the chosen template's files into that directory
- Update `package.json` with your project name and Stati metadata
- Set up optional styling scripts based on the chosen styling option
- Optionally install the Stati agent skill for AI coding assistants
- Initialize a Git repository by default (use `--no-git` to skip)
- Install dependencies by default (use `--no-install` to skip)

> **Note:** You can skip automatic dependency installation with `--no-install` and install them manually later.

## Interactive setup

The scaffolder will prompt you for:

1. **Project name** - Name for your new Stati site (skipped when you pass one)
2. **Template** - Blank, Blog or Docs (skipped with `--template`)
3. **Styling solution** - Choose between CSS, Sass, or Tailwind CSS (skipped with `--styling`)
4. **TypeScript** - On by default; answer no for a JavaScript project
5. **Image tools** - Off by default; answer yes for responsive images and link preview cards
6. **Agent skill** - Where to install the Stati agent skill, if at all
7. **Git initialization** - Whether to initialize a Git repository (skipped with `--no-git`)
8. **Dependency installation** - Whether to install dependencies automatically (skipped with `--no-install`)
9. **Package manager** - Which package manager to use (only when several are detected and another prompt was shown)

### Running without prompts

When the project name, `--template` and `--styling` are all given, the TypeScript, image tools and agent-skill prompts are skipped: the project uses TypeScript (unless `--no-typescript`) and gets neither image tools (unless `--images`) nor an agent skill (unless `--agent-skill`). The Git and install prompts still appear unless you pass `--no-git` and `--no-install`; there are no `--git` or `--install` flags. So a fully unattended run looks like this:

```bash
npx create-stati my-site --template=blank --styling=css --no-git --no-install
```

With `--no-install` nothing is installed, so run your package manager's install command afterwards. When the scaffolder does install, `--package-manager` (npm, yarn, pnpm or bun) chooses the tool; without it you are asked when more than one is available.

## Command line options

```bash
npx create-stati <project-name> [options]

Options:
  --template <name>        Template to use (blank|blog|docs)
  --styling <type>         CSS solution (css|sass|tailwind)
  --typescript, --ts       Use TypeScript (default)
  --no-typescript, --no-ts Use JavaScript instead of TypeScript
  --images                 Add image tools: responsive AVIF/WebP images and link
                           preview cards (@stati/images)
  --no-images              Skip image tools (default)
  --no-git                 Skip git initialization (default: initializes Git)
  --no-install             Skip dependency installation (default: installs dependencies)
  --package-manager <pm>   Package manager to use (npm|yarn|pnpm|bun)
  --agent-skill [target]   Install the Stati agent skill (claude|github|agents, default: claude)
  --no-agent-skill         Skip agent skill installation
  --help, -h               Show help message
```

## Image tools

Every Stati site gives its images a width, height and lazy loading. Image tools add [`@stati/images`](/configuration/images) for two more things: responsive AVIF and WebP versions of each image, and a link preview card for every page.

```bash
npx create-stati my-blog --template=blog --images
```

With image tools, the scaffolder:

- adds `@stati/images` to the project's dev dependencies;
- turns on `images.responsive` and `images.og` in the config, and explains `site.baseUrl` in the blank template's config, because preview images need absolute URLs;
- keeps the card template of the blog and docs templates, `site/og.eta`, with its fonts in `og/fonts/`. The blank template uses the card built into `@stati/images`.

Without image tools, the blog and docs templates' card template and fonts are left out. You can add the package later; see [Images](/configuration/images).

The package includes a native image encoder, so the prompt defaults to no.

## Agent skill

The scaffolder can copy the Stati agent skill into your project. The skill teaches AI coding assistants Stati's conventions for content, Eta templates, includes and helpers, configuration, and deployment.

| Target             | Installed to            | Discovered by                          |
| ------------------ | ----------------------- | -------------------------------------- |
| `claude` (default) | `.claude/skills/stati/` | Claude Code, GitHub Copilot in VS Code |
| `github`           | `.github/skills/stati/` | GitHub Copilot                         |
| `agents`           | `.agents/skills/stati/` | Tools using the `.agents` convention   |

In interactive mode you choose a target (or skip) when prompted. In non-interactive mode the skill is only installed when `--agent-skill` is passed. In Claude Code, invoke it with `/stati`.

```bash
npx create-stati my-site --agent-skill
npx create-stati my-site --agent-skill=github
```

## Project templates

Stati provides three templates:

- **blank** - Minimal starter with basic structure and example content
- **blog** - A complete blog with posts, tags, an archive, an RSS feed and SEO metadata
- **docs** - A complete documentation site with a sidebar, search, an on-page table of contents and SEO metadata

### Blank template

**What's included:**

- Basic site structure (`site/`, `public/`)
- A homepage that walks through the project, and a layout with header, navigation and footer
- One stylesheet with light and dark themes; colors and fonts are CSS custom properties
- Configuration file with sensible defaults
- Package.json with development scripts

### Blog template

A blog that works on first run. Its sample posts explain how each part of it works, so you can read them, then replace them with your own.

**What's included:**

- Markdown posts in `site/posts/`, listed newest first on the home page, five to a page
- A tags page with a page for every tag, a yearly archive, and newer, older and related posts under every post
- An RSS feed, a sitemap and `robots.txt`
- Open Graph and Twitter tags on every page
- Drafts that stay out of the build until you publish them, and a 404 page
- Light and dark themes with a self-hosted display face, styled from custom properties
- Listings read from Stati's [collections](/core-concepts/collections): `paginate` splits the home page, `site/tags/[tag].md` generates the tag pages, and `helpers/blog.js` adds helpers for related posts and dates; the blog uses no build hooks

The blog template ships its own `stati.config.js` with the feed, sitemap and SEO settings, and adds a `build:drafts` script (`stati build --include-drafts`). With TypeScript it becomes `stati.config.ts`; with Sass or Tailwind its stylesheet is carried over into `src/` so the design stays intact.

### Docs template

A documentation site that works on first run. Its sample pages explain how each part of it works, so you can read them, then replace them with your own.

**What's included:**

- A sidebar built from your folders: each top-level folder in `site/` is a section, each Markdown file a page, ordered by `order` in its front matter
- Search over Stati's search index, opened with <kbd>Ctrl</kbd> <kbd>K</kbd>, <kbd>⌘</kbd> <kbd>K</kbd> or <kbd>/</kbd>, with results that link to headings
- An on-page table of contents that highlights the section in view, previous and next links, and breadcrumbs
- Section overview pages and a home page that lists every section
- Code blocks highlighted at build time with `markdown-it-prism`, with a language label and a copy button
- Light and dark themes with a toggle, a mobile navigation drawer, and self-hosted Inter
- A sitemap, `robots.txt`, Open Graph and Twitter tags, and breadcrumb structured data
- Drafts that stay out of the build until you publish them, and a 404 page
- `helpers/docs.js`, which groups pages into sections in the `beforeAll` hook and exposes them to templates as helpers such as `stati.helpers.docsSections()` and `stati.helpers.docsPager()`
- `public/scripts/docs.js`, a dependency-free script for search, the theme toggle, the drawer and copy buttons; pages read fine without it

Like the blog, the docs template ships its own `stati.config.js`, which becomes `stati.config.ts` with TypeScript, and its stylesheet is carried over into `src/` with Sass or Tailwind.

## Styling solutions

Choose your preferred styling approach:

### CSS (default)

- One CSS file in `public/styles.css`, themed by custom properties at the top
- No preprocessing or build step required

### Sass

- Creates `src/styles.scss` from the template's stylesheet, with `$primary-color`, `$font-stack` and a breakpoint as Sass variables
- SCSS support with build scripts
- Automatic compilation during development and build
- Scripts added: `build:css`, `watch:css`
- Modified scripts: `build` and `dev` to include CSS compilation

### Tailwind CSS

- Installs Tailwind CSS 4: `tailwindcss` and its command line tool, `@tailwindcss/cli`
- Creates source stylesheet at `src/styles.css` compiled directly to `dist/styles.css`. It imports Tailwind and adds an `@source` rule for `.stati/tailwind-classes.html`, the classes Stati records from `stati.propValue()`. Tailwind finds the templates itself, so there is no `tailwind.config.js`
- For the blank template the stylesheet rebuilds the starter's look with `@apply`, Tailwind's slate and blue palette and `dark:` variants. For the blog and docs templates it keeps the template's own stylesheet in the `components` layer, where it overrides Tailwind's base styles and utility classes in your templates override it
- Scripts added: `build:css`
- Modified scripts:
  - `dev`: Uses Stati's built-in Tailwind integration (single process)
  - `build`: Runs Stati build, then CSS compilation

## Post-creation setup

After creating your site:

```bash
cd my-site
npm install  # Skip if you installed dependencies during setup
npm run dev
```

## Package scripts

All created projects include these base scripts:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview",
    "clean:dist": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\"",
    "clean:cache": "node -e \"require('node:fs').rmSync('.stati',{recursive:true,force:true})\"",
    "clean": "npm run clean:dist && npm run clean:cache"
  }
}
```

> **Note:** When using Sass or Tailwind CSS, the `build` and `dev` scripts are automatically modified to include CSS compilation steps. See the [Styling Solutions](#styling-solutions) section for details.

## Generated project structure

### Plain CSS (default)

```text
my-site/
├── site/
│   ├── index.md          # Homepage content
│   └── layout.eta        # Main layout template
├── public/
│   ├── styles.css        # Stylesheet
│   └── favicon.svg       # Site icon
├── src/
│   └── main.ts           # Client TypeScript entry point
├── stati.config.ts       # Stati configuration
├── tsconfig.json         # TypeScript compiler configuration
├── package.json          # Node.js project file
└── README.md            # Getting started guide
```

For the blank template, the scaffolder writes a fresh `stati.config.ts` that sets `site.title` (your project name), `site.description` and a placeholder `site.baseUrl` of `https://example.com`, and turns on `typescript`. (The blog and docs templates keep their own config, which also contains a placeholder `baseUrl`.) Set `site.baseUrl` to your real address before you deploy: canonical links, the sitemap and feeds start with it.

### With Sass

```text
my-site/
├── site/
│   └── ...
├── src/
│   └── styles.scss       # Sass source file
├── public/
│   └── favicon.svg       # Site icon
├── stati.config.ts
└── package.json          # Includes sass scripts
```

### With Tailwind CSS

```text
my-site/
├── site/
│   └── ...
├── src/
│   └── styles.css        # Tailwind source file and configuration
├── public/
│   └── favicon.svg       # Site icon
├── stati.config.ts
└── package.json          # Includes Tailwind scripts
```

With the blog and docs templates, `public/styles.css` is moved into `src/styles.css`, below the Tailwind import. The blank template gets Tailwind starter styles there instead. Either way `public/styles.css` is removed, because the build would copy it over the compiled `dist/styles.css`.

The `typecheck` script is added to `package.json` for validating your TypeScript code.

### With JavaScript

With `--no-typescript` (or answering no to the TypeScript prompt), the project has no `src/main.ts`, `tsconfig.json` or `typecheck` script, and the config is plain JavaScript:

```text
my-site/
├── site/
│   └── ...
├── stati.config.js       # Stati configuration
└── ...
```

### With the agent skill

When using `--agent-skill` (default target `claude`), the full skill bundle is copied:

```text
my-site/
├── .claude/
│   └── skills/
│       └── stati/
│           ├── SKILL.md      # Skill entry point
│           ├── references/   # Task-specific guidance
│           ├── assets/       # Starter files and examples
│           └── scripts/      # Helper scripts
└── ...
```

## Requirements

- Node.js 22.12+ or 24+
- npm, yarn, pnpm, or bun

## Next steps

- Start the development server: `npm run dev`
- Add content to the `site/` directory
- Customize the layout in `site/layout.eta`
- Configure your site in `stati.config.ts` (or `stati.config.js` for JavaScript projects)
- Learn more about [TypeScript support](/configuration/typescript)
