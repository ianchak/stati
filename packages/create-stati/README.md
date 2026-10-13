# create-stati

**The official scaffolding tool for Stati - get a new static site up and running in under 2 minutes.**

Create a production-ready Stati site with your choice of template and styling, complete with sensible defaults and best practices built-in.

---

## Quick Start

Create a new Stati site with a single command:

```bash
npx create-stati
```

The interactive wizard will guide you through:

1. **Project name** - What to call your site
2. **Template** - Starting point: blank, a complete blog, or a complete docs site
3. **CSS solution** - Plain CSS, Sass, or Tailwind
4. **TypeScript** - On by default; answer no for a JavaScript project
5. **Agent skill** - Optional Stati skill for AI coding assistants
6. **Git initialization** - Optional repository setup

In less than 2 minutes, you'll have a complete static site ready to customize.

---

## Non-Interactive Mode

Skip the prompts and create a site with specific options:

```bash
npx create-stati my-site --template=blank --styling=tailwind --git
```

**Available flags:**

- `--template <name>` - Template to use (`blank` | `blog` | `docs`)
- `--styling <type>` - CSS solution (`css` | `sass` | `tailwind`)
- `--typescript`, `--ts` - Use TypeScript (default)
- `--no-typescript`, `--no-ts` - Use JavaScript instead of TypeScript
- `--no-git` - Skip git initialization (default: initializes Git)
- `--no-install` - Skip dependency installation (default: installs dependencies)
- `--package-manager <pm>` - Package manager to use (`npm` | `yarn` | `pnpm` | `bun`)
- `--agent-skill [target]` - Install the Stati agent skill (`claude` | `github` | `agents`, default: `claude`)
- `--no-agent-skill` - Skip agent skill installation
- `--help`, `-h` - Show help message

**Examples:**

```bash
# Plain CSS (Git initialized by default)
npx create-stati my-blog --styling=css

# JavaScript instead of TypeScript, with Tailwind
npx create-stati my-app --no-typescript --styling=tailwind

# Tailwind without Git and skip install
npx create-stati my-portfolio --styling=tailwind --no-git --no-install

# Sass with pnpm as package manager
npx create-stati my-docs --styling=sass --package-manager=pnpm

# Install the Stati agent skill for Claude Code / Copilot
npx create-stati my-site --agent-skill

# Full control with all options
npx create-stati my-site --typescript --styling=tailwind --no-git --no-install --package-manager=yarn
```

> **Note:** In non-interactive mode (when using CLI flags), dependencies are installed by default using `npm`. Use `--package-manager` to specify a different package manager (yarn, pnpm, or bun).

---

## Interactive Setup

When you run `npx create-stati`, you'll see a friendly wizard:

```text
? Project name: my-site
? Choose a template: Blank
? Which CSS solution would you like? (Use arrow keys)
  > Plain CSS (recommended for beginners)
    Sass/SCSS
    Tailwind CSS
? Use TypeScript? (Y/n)
? Install the Stati agent skill for AI coding assistants? (Use arrow keys)
  > .claude/skills (Claude Code, Copilot in VS Code)
    .github/skills (GitHub Copilot)
    .agents/skills
    No
? Initialize a git repository? (Y/n)
? Install dependencies? (Y/n)
? Which package manager would you like to use? (Use arrow keys)
  > npm
    yarn
    pnpm
    bun
```

Each choice is explained, so you can make the right decision for your project.

> **Note:** The package manager prompt only appears if you choose to install dependencies and multiple package managers are detected on your system.

---

## TypeScript Support

TypeScript is on by default. Unless you pass `--no-typescript` or answer no at the prompt, your project will include:

- **`stati.config.ts`** - TypeScript configuration file with full type safety
- **`tsconfig.json`** - TypeScript compiler configuration optimized for browser targets
- **`src/main.ts`** - Entry point for your TypeScript code
- **`typecheck` script** - Run `npm run typecheck` to validate your TypeScript

### How It Works

Stati uses [esbuild](https://esbuild.github.io/) for lightning-fast TypeScript compilation:

- **Development mode** (`stati dev`): Stable filenames, source maps enabled, no minification
- **Production mode** (`stati build`): Hashed filenames for cache busting, minified output

Your compiled JavaScript bundle is **automatically injected** into your HTML output before the closing `</body>` tag. No template modifications needed!

The bundle path is also available via `stati.assets.bundlePath` for advanced use cases like preloading:

```eta
<head>
  <% if (stati.assets?.bundlePath) { %>
  <link rel="modulepreload" href="<%= stati.assets.bundlePath %>">
  <% } %>
</head>
```

---

## Agent Skill

create-stati can copy the [Stati agent skill](https://github.com/ianchak/stati/tree/main/.claude/skills/stati) into your project so AI coding assistants follow Stati's conventions (Eta templates, partials, configuration, and more).

| Target             | Installed to            | Discovered by                          |
| ------------------ | ----------------------- | -------------------------------------- |
| `claude` (default) | `.claude/skills/stati/` | Claude Code, GitHub Copilot in VS Code |
| `github`           | `.github/skills/stati/` | GitHub Copilot                         |
| `agents`           | `.agents/skills/stati/` | Tools using the `.agents` convention   |

In interactive mode you're asked where to install it. In non-interactive mode it is only installed when `--agent-skill` is passed. Invoke it in Claude Code with `/stati`.

---

## The Blog Template

A complete blog that works on first run: Markdown posts, a tags page, a yearly archive, newer, older and related posts, an RSS feed, a sitemap, `robots.txt`, Open Graph and `BlogPosting` metadata, drafts and a 404 page. The sample posts explain how each part works.

```bash
npx create-stati my-blog --template=blog
```

The blog ships its own `stati.config.js`; with TypeScript it becomes `stati.config.ts`, and with Sass or Tailwind its stylesheet moves into `src/` so the design stays intact.

---

## The Docs Template

A complete documentation site that works on first run: a sidebar built from your folders, Ctrl+K search, an on-page table of contents, previous and next links, breadcrumbs, build-time syntax highlighting with copy buttons, light and dark themes, a mobile drawer, a sitemap, `robots.txt`, link previews, drafts and a 404 page. The sample pages explain how each part works.

```bash
npx create-stati my-docs --template=docs
```

Like the blog, it ships its own `stati.config.js`; with TypeScript it becomes `stati.config.ts`, and with Sass or Tailwind its stylesheet moves into `src/` so the design stays intact.

---

## The Blank Template

A minimal, flexible starting point for any type of Stati site.

### What You Get

**Features:**

- Clean, minimal layout with no opinionated styling
- Basic page structure with welcome content and clear instructions
- Responsive design foundation ready to customize
- Extensible architecture for any project type
- Just the essentials - build on your own terms

**File Structure (Plain CSS):**

```text
my-site/
├── site/
│   ├── index.md          # Homepage with welcome content
│   └── layout.eta        # Main HTML layout template
├── public/
│   ├── styles.css        # Basic CSS styles
│   └── favicon.svg       # Default favicon
├── stati.config.js       # Stati configuration
└── package.json          # Project dependencies
```

**File Structure (Sass):**

```text
my-site/
├── site/
│   └── ...
├── src/
│   └── styles.scss       # Sass source file
├── public/
│   └── favicon.svg       # Site icon
├── stati.config.js
└── package.json          # Includes sass scripts
```

**File Structure (Tailwind CSS):**

```text
my-site/
├── site/
│   └── ...
├── src/
│   └── styles.css        # Tailwind source file
├── public/
│   └── favicon.svg       # Site icon
├── tailwind.config.js    # Tailwind configuration
├── stati.config.js
└── package.json          # Includes Tailwind scripts
```

**What's Included:**

- **Homepage (`site/index.md`)** - Welcome page with getting started instructions
- **Layout (`site/layout.eta`)** - HTML5 boilerplate with responsive meta tags
- **Styles** - CSS in `public/` (plain CSS) or `src/` (Sass/Tailwind)
- **Configuration (`stati.config.js`)** - Pre-configured with sensible defaults
- **Favicon (`public/favicon.svg`)** - Simple SVG favicon ready to customize

### Perfect For

- Personal websites and portfolios
- Landing pages and marketing sites
- Learning Stati fundamentals
- Any project where you want full control

### Getting Started with Blank

1. The homepage provides clear next steps
2. Edit `site/index.md` to add your content
3. Customize `site/layout.eta` for your HTML structure
4. Update your styles (in `public/` for plain CSS, `src/` for Sass/Tailwind)
5. Configure site metadata in `stati.config.js`

---

## CSS Options

Choose the styling approach that fits your workflow.

### Plain CSS (Recommended for Beginners)

- Simple and straightforward
- No build step required
- Full control over every style
- Great for learning
- Styles location: `public/styles.css`

### Sass/SCSS

- CSS with superpowers (variables, nesting, mixins)
- Compiles to standard CSS
- Popular and well-supported
- Styles location: `src/styles.scss` → compiles to `dist/styles.css`

### Tailwind CSS

- Utility-first framework
- Rapid prototyping
- Built-in design system
- Automatic purging for production
- Styles location: `src/styles.css` → compiles to `dist/styles.css`

---

## After Creation

Once your site is created, follow these steps:

### 1. Install Dependencies (if needed)

If you chose to install dependencies during scaffolding, you can skip this step. Otherwise, navigate to your project directory and install dependencies with your preferred package manager:

```bash
cd my-site

# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install

# Using bun
bun install
```

### 2. Start Development

```bash
npm run dev
```

Your site will be live at `http://localhost:3000` with hot reload.

### 3. Build for Production

```bash
npm run build
```

Static files will be generated in the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

Test your production build at `http://localhost:4000`.

---

## Project Structure

All Stati sites follow this conventional structure:

```text
my-site/
├── site/             # Your content and templates
│   ├── *.md          # Markdown pages
│   ├── *.eta         # Eta templates
│   └── _partials/    # Reusable template parts (optional)
├── public/           # Static assets (CSS, images, fonts)
├── stati.config.js   # Stati configuration
├── package.json      # Project metadata and scripts
└── dist/             # Built site (generated on build)
```

**How it works:**

- **`site/`** - All your content lives here. Markdown files become pages.
- **`public/`** - Static assets copied as-is to your build.
- **`stati.config.js`** - Configure your site's behavior.
- **`dist/`** - Your built static site, ready to deploy.

---

## Next Steps

### Learn Stati

- [Documentation](https://stati.build) - Complete guides and tutorials
- [Core Concepts](https://stati.build/core-concepts/overview/) - Templates, routing, and markdown
- [Configuration](https://stati.build/configuration/file/) - Site config, ISG, and hooks
- [Examples](https://stati.build/examples/list/) - Real-world recipes

### Customize Your Site

- Modify layouts and styles to match your brand
- Add new pages in the `site/` directory
- Create reusable partials in `site/_partials/`
- Configure SEO, sitemap, and robots.txt

### Deploy

Build your site and deploy to any static hosting:

- **Netlify** - Drag and drop `dist/` or connect Git
- **Vercel** - Import your repository
- **GitHub Pages** - Push `dist/` to `gh-pages` branch
- **Any static host** - Just upload the `dist/` folder

---

## Configuration Example

Each template comes with a pre-configured `stati.config.js` optimized for that use case:

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
});
```

You can customize this file to add features like SEO, sitemap, ISG caching, and more. See the [Configuration Guide](https://stati.build/configuration/file/) for all options.

---

## Requirements

- **Node.js** ^22.12.0 || >=24
- **npm** 11.5.1 or higher (or yarn/pnpm equivalent)

---

## Learn More

- [Full Documentation](https://stati.build) - Complete guides and tutorials
- [CLI Commands](https://stati.build/cli/commands/) - All available commands
- [Core Concepts](https://stati.build/core-concepts/overview/) - How Stati works
- [Examples](https://stati.build/examples/list/) - Real-world projects and recipes

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas
- [Documentation](https://stati.build) - Comprehensive guides

---

## License

MIT © [Imre Csige](https://github.com/ianchak)
