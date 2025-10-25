# @stati/cli

**The command-line interface for Stati — a minimal, TypeScript-first static site generator that's fast to learn and even faster to build with.**

Run your development server, build for production, and manage your site's cache with simple commands.

---

## Getting Started

### The Easy Way (Recommended)

If you're new to Stati, start by creating a new site with our scaffolding tool:

```bash
npx create-stati my-site
cd my-site
npm install
npm run dev
```

This creates a complete Stati project with the CLI already configured in your `package.json`.

### For Existing Projects

Add Stati CLI to an existing project:

```bash
npm install --save-dev @stati/cli
```

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
- Live reloads your browser when content or templates change
- Shows build errors in an overlay for quick debugging

**Options:**

- `--port <number>` - Server port (default: 3000)
- `--open` - Open browser automatically
- `--config <path>` - Path to custom config file

**Examples:**

```bash
# Start on default port
npm run dev

# Start on custom port and open browser
stati dev --port 8080 --open

# Use custom config
stati dev --config ./my-config.js
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
- Optimizes output for production
- Uses smart caching to skip unchanged pages (ISG)
- Creates sitemap and robots.txt (if configured)
- Reports build statistics and performance metrics

**Options:**

- `--force` - Force full rebuild (keeps cache but rebuilds all pages)
- `--clean` - Clean cache before building (fresh start)
- `--config <path>` - Path to custom config file
- `--include-drafts` - Include draft pages in the build

**Examples:**

```bash
# Standard production build
npm run build

# Clean build (removes cache first)
stati build --clean

# Force rebuild without clearing cache
stati build --force

# Include draft pages
stati build --include-drafts
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
- `--open` - Open browser automatically
- `--config <path>` - Path to custom config file

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
- `path:value` - Invalidate by path (supports prefixes)
- `glob:pattern` - Invalidate by glob pattern
- `age:duration` - Invalidate content younger than specified age
- No query - Clear entire cache

**Examples:**

```bash
# Invalidate all blog posts
stati invalidate "tag:blog"

# Invalidate specific path
stati invalidate "path:/posts"

# Invalidate using glob pattern
stati invalidate "glob:/blog/**"

# Invalidate recent content (younger than 3 months)
stati invalidate "age:3months"

# Invalidate week-old content
stati invalidate "age:1week"

# Multiple criteria (OR logic)
stati invalidate "tag:blog age:1month"

# Clear entire cache
stati invalidate
```

**Age Formats:**

- `age:30days` or `age:30day` - Content younger than 30 days
- `age:2weeks` or `age:2week` - Content younger than 2 weeks
- `age:6months` or `age:6month` - Content younger than 6 months
- `age:1year` or `age:1years` - Content younger than 1 year

**Note:** Age calculations use exact calendar arithmetic. Months and years account for varying month lengths and leap years.

---

## Quick Start Guide

### Creating Your First Site

1. **Create a new site:**

   ```bash
   npx create-stati my-site
   ```

2. **Navigate to your project:**

   ```bash
   cd my-site
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start developing:**

   ```bash
   npm run dev
   ```

   Your site will be available at `http://localhost:3000`

5. **Make changes:**

   - Edit `site/index.md` for your homepage content
   - Modify `site/layout.eta` for your HTML structure
   - Update `public/styles.css` for styling
   - Configure `stati.config.js` for site settings

6. **Build for production:**

   ```bash
   npm run build
   ```

   Your static site will be in the `dist/` directory

7. **Preview production build:**

   ```bash
   npm run preview
   ```

   Test your production build at `http://localhost:4000`

---

## Common Workflows

### Development Workflow

```bash
# Start development server
npm run dev

# Edit your content in site/
# Save files and see changes instantly

# When ready, build for production
npm run build
```

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
# After updating a template that affects blog posts
stati invalidate "tag:blog"

# Rebuild affected pages
npm run build

# Or do a clean build
npm run build -- --clean
```

---

## Learn More

- [Full Documentation](https://docs.stati.build) - Complete guides and tutorials
- [CLI Reference](https://docs.stati.build/cli/commands/) - Detailed command documentation
- [Configuration](https://docs.stati.build/configuration/file/) - All configuration options
- [Core Concepts](https://docs.stati.build/core-concepts/overview/) - How Stati works
- [Examples](https://docs.stati.build/examples/list/) - Real-world projects

---

## Requirements

- **Node.js** >=22
- **npm** 11.5.1 or higher (or equivalent package manager)

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas
- [Documentation](https://docs.stati.build) - Comprehensive guides

---

MIT © [Imre Csige](https://github.com/ianchak)
