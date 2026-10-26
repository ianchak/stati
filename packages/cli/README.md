# @stati/cli

**The command-line interface for Stati - a minimal, TypeScript-first static site generator that's fast to learn and even faster to build with.**

Run your development server, build for production, and manage your site's cache with simple commands.

---

## Getting Started

### The Easy Way (Recommended)

If you're new to Stati, start by creating a new site with our scaffolding tool:

```bash
npx create-stati my-site

cd my-site
npm run dev
```

This creates a complete Stati project with the CLI already configured in your `package.json`.

### For Existing Projects

Add Stati CLI to an existing project:

```bash
npm install --save-dev @stati/cli @stati/core
```

Install `@stati/core` too: your `stati.config.ts` imports `defineConfig` from it, and strict package managers such as pnpm do not expose the CLI's own copy to your project.

Then add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview"
  }
}
```

### One-Time Usage

Use npx to run Stati commands without installation:

```bash
npx @stati/cli dev
npx @stati/cli build
npx @stati/cli preview
```

This works for a folder of Markdown and templates without a config file. A `stati.config.*` that imports `@stati/core` needs the package installed in the project; otherwise the config fails to load and Stati falls back to its defaults. Use the package name here: `npx stati` without a local install downloads an unrelated npm package called `stati`.

---

## Commands

### `stati dev` - Development Server

Start a development server with live reload and instant feedback:

```bash
npm run dev
# or
stati dev [options]
```

**What it does:**

- Starts a local development server (default: `http://localhost:3000`)
- Watches your files for changes and rebuilds automatically
- Compiles TypeScript with source maps (when `typescript.enabled` is true)
- Live reloads your browser when content or templates change
- Shows build errors in an overlay for quick debugging

**Options:**

- `--port <number>` - Server port (default: 3000)
- `--host <string>` - Host address (default: localhost)
- `--open` - Open browser automatically
- `--tailwind-input <path>` - Tailwind CSS input file; starts a Tailwind watcher alongside the dev server
- `--tailwind-output <path>` - Output file for the compiled Tailwind CSS; pages link it when it is in the output directory
- `--tailwind-verbose` - Show all Tailwind output (default: errors only)

**Examples:**

```bash
# Start on default port
npm run dev

# Start on custom port and open browser
stati dev --port 8080 --open

# Run the Tailwind watcher in the same process
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

---

### `stati build` - Production Build

Build your site for production deployment:

```bash
npm run build
# or
stati build [options]
```

**What it does:**

- Generates static HTML files from your content and templates
- Runs in production mode: minified, hashed TypeScript bundles
- Names stylesheets after their content, such as `/_assets/styles-[hash].css`, and points the pages' `<link>` tags at them: the stylesheets in `public/` that pages link, and, with the Tailwind flags, the stylesheet Tailwind CSS builds after the last page renders
- Uses smart caching to skip unchanged pages (ISG)
- Creates sitemap, robots.txt and RSS feeds (if configured)
- Reports build statistics, and with `--metrics` writes performance metrics

**Options:**

- `--force` - Re-render every page, ignoring the ISG cache (the cache is kept and updated)
- `--clean` - Delete the output directory and the `.stati/` cache before building
- `--include-drafts` - Include draft pages in the build
- `--metrics` - Collect build metrics (also enabled by `STATI_METRICS=1`)
- `--metrics-file <name>` - Metrics file name inside `.stati/metrics/`
- `--metrics-detailed` - Include per-page timings in the metrics
- `--metrics-html` - Write an HTML report next to the metrics JSON
- `--tailwind-input <path>` - Tailwind CSS input file; give it with `--tailwind-output`
- `--tailwind-output <path>` - The stylesheet's file in the output directory, such as `dist/styles.css`; production writes `dist/_assets/styles-[hash].css` instead unless `css.hash` is `false`

**Examples:**

```bash
# Standard production build
npm run build

# Clean build (removes dist/ and the cache first)
stati build --clean

# Force rebuild without clearing cache
stati build --force

# Include draft pages
stati build --include-drafts

# Build the Tailwind CSS stylesheet with the site
stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

---

### `stati preview` - Preview Production Build

Preview your built site locally before deployment:

```bash
npm run preview
# or
stati preview [options]
```

**What it does:**

- Serves static files from your `dist/` directory
- Tests your production build locally
- No live reload or rebuilding (serves files as-is)
- Perfect for final testing before deployment

**Options:**

- `--port <number>` - Server port (default: 4000)
- `--host <string>` - Host address (default: localhost)
- `--open` - Open browser automatically

**Examples:**

```bash
# Preview on default port
npm run preview

# Preview on custom port and open browser
stati preview --port 8000 --open
```

---

### `stati invalidate` - Cache Management

Selectively clear your site's cache to force rebuilds:

```bash
stati invalidate [query]
```

**What it does:**

- Removes specific pages from the ISG cache
- Forces them to rebuild on next build
- Supports multiple query types for flexible targeting
- Useful for updating related content together

**Query Formats:**

- `tag:value` - Invalidate pages with specific tag
- `path:value` - Invalidate cache entries whose key starts with this prefix (keys are output paths such as `/blog/post.html`)
- `glob:pattern` - Invalidate by a glob pattern matched against the whole key
- `age:duration` - Invalidate pages rendered within the specified period
- No query - Clear entire cache

**Examples:**

```bash
# Invalidate all blog posts
stati invalidate "tag:blog"

# Invalidate specific path
stati invalidate "path:/posts"

# Invalidate using glob pattern
stati invalidate "glob:/blog/**"

# Invalidate pages rendered within the last 3 months
stati invalidate "age:3months"

# Invalidate pages rendered within the last week
stati invalidate "age:1week"

# Multiple criteria (OR logic)
stati invalidate "tag:blog age:1month"

# Clear entire cache
stati invalidate
```

**Age Formats:**

- `age:30days` or `age:30day` - Rendered within the last 30 days
- `age:2weeks` or `age:2week` - Rendered within the last 2 weeks
- `age:6months` or `age:6month` - Rendered within the last 6 months
- `age:1year` or `age:1years` - Rendered within the last year

**Note:** Age calculations use exact calendar arithmetic. Months and years account for varying month lengths and leap years.

---

## Common Workflows

### Editing Your Site

- Edit `site/index.md` for your homepage content
- Modify the `.eta` templates in `site/` for your HTML structure
- Update your stylesheet (`public/styles.css`, or `src/` with Sass or Tailwind)
- Configure `stati.config.ts` (or `stati.config.js`) for site settings

### Deployment Workflow

```bash
# Clean build for production
npm run build -- --clean

# Test production build locally
npm run preview

# Deploy dist/ folder to your hosting provider
# (Netlify, Vercel, GitHub Pages, etc.)
```

### Cache Management Workflow

```bash
# After changing data Stati can't track, such as a file a helper reads
stati invalidate "tag:blog"

# Rebuild affected pages
npm run build

# Or do a clean build
npm run build -- --clean
```

---

## Learn More

- [Full Documentation](https://stati.build) - Complete guides and tutorials
- [CLI Reference](https://stati.build/cli/commands/) - Detailed command documentation
- [Configuration](https://stati.build/configuration/file/) - All configuration options
- [Core Concepts](https://stati.build/core-concepts/overview/) - How Stati works
- [Examples](https://stati.build/examples/list/) - Real-world projects

---

## Requirements

- **Node.js** ^22.20.0 || >=24
- **A package manager**: npm, pnpm, yarn or bun

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas
- [Documentation](https://stati.build) - Comprehensive guides

---

MIT © [Imre Csige](https://github.com/ianchak)
