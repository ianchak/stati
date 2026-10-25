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

# A complete news site
npx create-stati my-news --template=news

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
2. **Template** - Blank, Blog, Docs or News (skipped with `--template`)
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
  --template <name>        Template to use (blank|blog|docs|news)
  --styling <type>         CSS solution (css|sass|tailwind)
  --typescript, --ts       Use TypeScript (default)
  --no-typescript, --no-ts Use JavaScript instead of TypeScript
  --images                 Add image tools: responsive AVIF/WebP images and link
                           preview cards (@stati/images)
  --no-images              Skip image tools (default)
  --no-git                 Skip git initialization (default: initializes Git)
  --no-install             Skip dependency installation (default: installs dependencies)
  --package-manager <pm>   Package manager to use (npm|yarn|pnpm|bun)
  --agent-skill [target]   Install the Stati agent skill (claude|agents, default: claude)
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
- turns on `images.responsive` and `images.og` in the config. Preview images need absolute URLs, so set the placeholder `site.baseUrl` to your real address before you deploy;
- keeps the card template of the blog, docs and news templates, `site/og.eta`, with its fonts in `og/fonts/`. The blank template uses the card built into `@stati/images`.

Without image tools, the blog, docs and news templates' card template and fonts are left out. You can add the package later; see [Images](/configuration/images).

The package includes a native image encoder, so the prompt defaults to no.

## Agent skill

The scaffolder can add the Stati agent skill to your project. The skill teaches AI coding assistants Stati's conventions for content, Eta templates, includes and helpers, configuration, and deployment.

| Target             | `skills` agent | Installed to            | Discovered by                            |
| ------------------ | -------------- | ----------------------- | ---------------------------------------- |
| `claude` (default) | `claude-code`  | `.claude/skills/stati/` | Claude Code, GitHub Copilot in VS Code   |
| `agents`           | `universal`    | `.agents/skills/stati/` | GitHub Copilot, Codex, Cursor and others |

In interactive mode you choose a target (or skip) when prompted. In non-interactive mode the skill is only installed when `--agent-skill` is passed. In Claude Code, invoke it with `/stati`. `--agent-skill=github` still works and installs to `.agents/skills/stati/`, which Copilot reads.

```bash
npx create-stati my-site --agent-skill
npx create-stati my-site --agent-skill=agents
```

The scaffolder installs the skill with the open [`skills` CLI](https://github.com/vercel-labs/skills), from the `main` branch of the Stati repository:

```bash
npx --yes skills@1 add ianchak/stati --skill stati --agent claude-code --copy --yes --json
```

It copies plain files (no symlinks) and writes `skills-lock.json` in the project root, which records where the skill came from. This needs `git` on your `PATH` and network access, even with `--no-git`. If the install fails, the site is still created and the scaffolder prints the command to add the skill later.

### Add or update the skill in an existing site

```bash
# Add the skill to an existing Stati site (asks which agents)
npx skills add ianchak/stati --skill stati

# Without prompts, for Claude Code and Copilot in VS Code
npx skills add ianchak/stati --skill stati -a claude-code --copy -y
# Without prompts, into .agents/skills (Copilot, Codex, Cursor and others)
npx skills add ianchak/stati --skill stati -a universal --copy -y

# Update the skill
npx skills update stati -p
```

- Commit `skills-lock.json`. Without it, `npx skills update` finds nothing to update.
- An update replaces the whole folder: edits to the skill's files and files added to it are removed without warning, and `npx skills update` doesn't notice local edits. Put project rules in `CLAUDE.md` or `AGENTS.md`, not in the skill.
- Copies made by hand or by older create-stati releases, which copied the skill from the package, have no `skills-lock.json` entry, so `npx skills update` skips them (with `-y` it even falls back to personal skills and reports none). Run `npx skills add` once: it replaces the copy and tracks it from then on.
- The CLI doesn't manage `.github/skills/stati`. Add the skill to `.claude/skills` or `.agents/skills`, then delete the old folder so Copilot doesn't see two skills named `stati`.
- For a personal install, add `-g`. With `-a claude-code` it goes to `~/.claude/skills/stati`.
- The CLI sends anonymous usage data unless `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set.

## Project templates

Stati provides four templates:

- **blank** - Minimal starter with basic structure and example content
- **blog** - A complete blog with posts, tags, an archive, an RSS feed and SEO metadata
- **docs** - A complete documentation site with a sidebar, search, an on-page table of contents and SEO metadata
- **news** - A complete news site with sections, a ranked front page, author pages, feeds, search and SEO metadata

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

### News template

A news site that works on first run. Its sample articles explain how each part of it works, so you can read them, then replace them with your own.

**What's included:**

- Sections as folders in `site/news/`, listed once in `site.sections` in the config; each gets a tab, a page at `/news/<section>` and an RSS feed
- A front page ranked by front matter: a lead story (`lead: true`), top stories (`featured: true`), a strip of the latest stories and a column per section, each story shown once
- Articles with a standfirst, bylines linking to author pages, published and updated dates, a lead image with caption and credit, reading time, more from the section and related stories
- Authors listed once in `site.authors`, with an index and a page for each; topic pages from tags; a latest-stories stream grouped by day; pagination on every listing
- Search over Stati's search index, opened with <kbd>/</kbd>, <kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>⌘</kbd> <kbd>K</kbd>
- An RSS feed for the whole site and one per section, a sitemap, a Google News sitemap (`news-sitemap.xml`) and `robots.txt`
- `NewsArticle` structured data and Open Graph article tags with the section and author on every article
- Light and dark themes following the system setting, with self-hosted Libre Franklin and Source Serif 4; drafts and a 404 page
- `helpers/news.js`, which ranks the front page, builds bylines and dates for templates, returns one page per section and author from `collections.generate`, fills in each article's reading time and metadata in the `beforeAll` hook, and writes the Google News sitemap in `afterAll`
- `public/scripts/news.js`, a dependency-free search dialog; pages work without it

Like the blog and docs templates, it ships its own `stati.config.js`, which becomes `stati.config.ts` with TypeScript, and its stylesheet is carried over into `src/` with Sass or Tailwind.

## Styling solutions

Choose your preferred styling approach:

### CSS (default)

- One CSS file in `public/styles.css`, themed by custom properties at the top
- No preprocessing or build step required

### Sass

- Creates `src/styles.scss` from the template's stylesheet, with `$primary-color`, `$font-stack` and a breakpoint as Sass variables
- Compiles it into `public/styles.css`, which the templates link: `build:css` before `stati build`, and `watch:css` next to `stati dev`. Production builds name the stylesheet after its content, like any stylesheet in `public/` (see [CSS](/configuration/css#sass))
- Scripts added: `build:css`, `watch:css`
- Modified scripts: `build` and `dev` to include CSS compilation
- Lists `public/styles.css` in the generated `.gitignore`

### Tailwind CSS

- Installs Tailwind CSS 4: `tailwindcss` and its command line tool, `@tailwindcss/cli`
- Creates source stylesheet at `src/styles.css`, which `stati dev` compiles to `dist/styles.css` and `stati build` to `dist/_assets/styles-<hash>.css`. It imports Tailwind and adds an `@source` rule for `.stati/tailwind-classes.html`, the classes Stati records from `stati.propValue()`. Tailwind finds the templates itself, so there is no `tailwind.config.js`
- For the blank template the stylesheet rebuilds the starter's look with `@apply`, Tailwind's slate and blue palette and `dark:` variants. For the blog, docs and news templates it keeps the template's own stylesheet in the `components` layer, where it overrides Tailwind's base styles and utility classes in your templates override it
- The templates keep their `<link>` to `/styles.css`, which production builds point at the hashed file
- Modified scripts, both using Stati's built-in Tailwind integration (single process):
  - `dev`: `stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css`
  - `build`: `stati build` with the same flags, which runs Tailwind after the last page renders (see [CSS](/configuration/css))

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

> **Note:** When using Sass or Tailwind CSS, the `build` and `dev` scripts are automatically modified to compile the CSS: Sass adds steps around the Stati commands, Tailwind adds flags to them. See the [Styling Solutions](#styling-solutions) section for details.

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

For the blank template, the scaffolder writes a fresh `stati.config.ts` that sets `site.title` (your project name), `site.description` and a placeholder `site.baseUrl` of `https://example.com`, and turns on `typescript`. (The blog, docs and news templates keep their own config, which also contains a placeholder `baseUrl`.) Set `site.baseUrl` to your real address before you deploy: canonical links, the sitemap and feeds start with it.

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

With the blog, docs and news templates, `public/styles.css` is moved into `src/styles.css`, below the Tailwind import. The blank template gets Tailwind starter styles there instead. Either way `public/styles.css` is removed, because every build would copy it over the dev server's `dist/styles.css`.

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

With `--agent-skill` (default target `claude`), the skill is installed in `.claude/skills/stati/` and recorded in `skills-lock.json`:

```text
my-site/
├── .claude/
│   └── skills/
│       └── stati/
│           ├── SKILL.md      # Skill entry point
│           ├── references/   # Task-specific guidance
│           ├── assets/       # Starter files and examples
│           └── scripts/      # Helper scripts
├── skills-lock.json          # Where the skill came from, for updates
└── ...
```

## Requirements

- Node.js 22.20+ or 24+
- npm, yarn, pnpm, or bun

## Next steps

- Start the development server: `npm run dev`
- Add content to the `site/` directory
- Customize the layout in `site/layout.eta`
- Configure your site in `stati.config.ts` (or `stati.config.js` for JavaScript projects)
- Learn more about [TypeScript support](/configuration/typescript)
