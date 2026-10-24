---
title: 'Commands'
description: 'Learn about Stati command-line interface and available commands.'
order: 1
seo:
  title: 'Stati CLI commands'
---

# Commands

Stati provides a simple and powerful command-line interface for building, developing, and managing your static sites. The CLI is designed to be intuitive while providing advanced options for complex workflows.

## Requirements

- Node.js 22.20 or higher, or 24 and later
- npm, pnpm, yarn or bun

## Running Stati commands

When you install `@stati/cli` as a dev dependency (the recommended approach), the `stati` binary is available in your project's `node_modules/.bin` directory. There are three ways to run Stati commands:

### Using npm scripts (recommended)

Define commands in your `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview",
    "invalidate": "stati invalidate"
  }
}
```

Then run them with npm:

```bash
npm run dev
npm run build
npm run invalidate -- "tag:blog"  # Pass arguments after --
```

This is the recommended approach because it keeps your project self-contained and works consistently across all environments.

### Using npx

Run any Stati command directly with `npx`:

```bash
npx stati dev
npx stati build --clean
npx stati invalidate "tag:blog"
```

> **Note:** `npx stati` runs the `stati` binary from your project's `@stati/cli` dev dependency. In a folder without `@stati/cli` installed, npx would download the unrelated npm package that is literally named `stati` instead. Install the CLI first, or call it by its package name: `npx @stati/cli build`.

### Global installation (optional)

If you prefer using `stati` directly without `npm run` or `npx`, install the CLI globally:

```bash
npm install -g @stati/cli
```

Then run commands directly:

```bash
stati dev
stati build
```

> **Note:** The examples below show commands as `stati <command>` for brevity. Use whichever method suits your workflow - the commands and options are identical.

## Available commands

### `stati dev`

Start development server with live reload and incremental builds.

```bash
stati dev [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | number | 3000 | Port to run the dev server on |
| `--host` | string | localhost | Host to bind the dev server to |
| `--open` | boolean | false | Open browser after starting server |
| `--config` | string | - | Builds pages with the config in this path's directory; the server's own settings still come from the current directory (see [Config file location](#config-file-location)) |
| `--tailwind-input` | string | - | Input file path for Tailwind CSS watcher |
| `--tailwind-output` | string | - | Output file path for compiled Tailwind CSS; pages link it when it is a `.css` file in the output directory (see [CSS](/configuration/css)) |
| `--tailwind-verbose` | boolean | false | Show all Tailwind CSS output (default shows errors only) |

**Examples:**

```bash
# Basic development server
stati dev

# Custom port and host
stati dev --port 8080 --host 0.0.0.0

# Open browser automatically
stati dev --open

# With Tailwind CSS integration
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css

# Tailwind with verbose output
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css --tailwind-verbose
```

### `stati preview`

Start preview server for built site.

```bash
stati preview [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | number | 4000 | Port to run the preview server on |
| `--host` | string | localhost | Host to bind the preview server to |
| `--open` | boolean | false | Open browser after starting server |
| `--config` | string | - | Accepted, but `preview` currently loads the config from the current directory (see [Config file location](#config-file-location)) |

**Examples:**

```bash
# Basic preview
stati preview

# Custom port and host
stati preview --port 8080 --host 0.0.0.0

# Open browser automatically
stati preview --open
```

The preview server serves `dist/` as built, with no live reload. Extensionless URLs such as `/about` are served from `about.html`, and query strings are ignored, so `/about?ref=nav` serves the same file. A missing file gets your site's `404.html` (from `site/404.md`) with a 404 status, as most static hosts do, or a plain-text 404 when the site has none. `stati dev` serves files the same way, with live reload added to the 404 page.

### `stati build`

Build site for production.

```bash
stati build [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--force` | boolean | false | Re-render every page, ignoring the ISG cache (the cache is kept and updated) |
| `--clean` | boolean | false | Delete the output directory and the `.stati/` cache before building |
| `--config` | string | - | Path to a config file; only its directory is used (see [Config file location](#config-file-location)) |
| `--include-drafts` | boolean | false | Include draft pages in the build |
| `--metrics` | boolean | false | Enable build metrics collection (also enabled by `STATI_METRICS=1` or `true`) |
| `--metrics-file` | string | - | Metrics JSON file name, resolved inside `.stati/metrics/`; paths outside that folder are rejected (default: `.stati/metrics/build-<timestamp>.json`) |
| `--metrics-detailed` | boolean | false | Include per-page timing in metrics |
| `--metrics-html` | boolean | false | Generate HTML report alongside JSON metrics |
| `--tailwind-input` | string | - | Input file for Tailwind CSS, which runs after the last page renders; needs `--tailwind-output` |
| `--tailwind-output` | string | - | The stylesheet's file in the output directory, such as `dist/styles.css`; unless `css.hash` is `false`, production writes `dist/_assets/<name>-<hash>.css` instead, such as `styles-A1B2C3D4.css` (see [CSS](/configuration/css)) |

**Examples:**

```bash
# Basic build
stati build

# Clean build
stati build --clean

# Force rebuild ignoring cache
stati build --force

# Include draft pages
stati build --include-drafts

# Collect build metrics
stati build --metrics

# Collect detailed build metrics with HTML report
stati build --metrics --metrics-detailed --metrics-html

# Build the Tailwind CSS stylesheet as well
stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

**Removed pages:** `stati build` deletes the HTML of pages that no longer exist, such as a deleted post, a tag no post uses or the last page of a listing that got shorter, along with folders left empty. It only deletes files it recorded in `.stati/manifest.json`, so files from `public/` or other tools stay. See [ISG](/core-concepts/isg#removing-pages-that-no-longer-exist).

**Bundles, stylesheet and search index:** a production build writes TypeScript bundles, the Tailwind stylesheet and the search index under hashed names, and deletes the copies earlier builds wrote under other names: `dist/_assets/<bundleName>-<hash>.js` files and the `<bundleName>.js` and source map `stati dev` writes, for the bundles in your config, `dist/_assets/<name>-<hash>.css` files (the `--tailwind-output` file `stati dev` writes stays), and `dist/<indexName>-<hash>.json`. Files with other names, such as your own files in `public/_assets/`, stay. Files of a bundle you removed from the config stay until you run `stati build --clean`.

**Images:** `stati build` reuses generated images from earlier builds and deletes the ones in `dist/_img/` that no page uses any more. It only deletes files it generated, never files from `public/`. The dev server doesn't delete them. `--clean` removes the image cache with the rest of `.stati/`, so the next build encodes every image again. See [Images](/configuration/images#caching-and-cleanup).

### `stati invalidate`

Invalidate cache entries by tag, path, pattern, or age.

```bash
stati invalidate [query]
```

Cache entries are keyed by **output path**, with a leading slash: `/index.html`, `/about.html`, `/blog.html`, `/blog/first-post.html`. `path:` and `glob:` match against these keys.

**Query Patterns:**

| Pattern | Format | Example | Description |
|---------|--------|---------|-------------|
| Tag | `tag:value` | `tag:blog` | Entries whose front matter `tags` contain the value (exact, case-sensitive) |
| Path | `path:/prefix` | `path:/blog` | Entries whose key starts with the value (plain text prefix: `/blog` matches `/blog.html` and `/blog/first-post.html`, and also `/blog-archive.html`) |
| Glob | `glob:pattern` | `glob:/blog/**` | Entries whose whole key matches the glob; include the leading `/` |
| Age | `age:duration` | `age:1week` | Entries **rendered** within the given period: `days`, `weeks`, `months`, `years` (singular or plural); months and years use calendar arithmetic |
| Plain term | `term` | `news` | Entries with a tag containing the text, or a key containing it |
| Clear All | (empty) | `stati invalidate` | Clear entire cache |

A query can hold several terms separated by spaces; an entry is invalidated if it matches **any** of them. To use a value that contains spaces, quote it inside the query, for example `stati invalidate '"tag:release notes" path:/blog'`.

Invalidation only removes entries from `.stati/manifest.json`; the pages are re-rendered on the next `stati build`.

**Examples:**

```bash
# Invalidate all content with 'blog' tag
stati invalidate tag:blog

# Invalidate one page (its key is /about.html)
stati invalidate path:/about

# Invalidate everything under /blog/
stati invalidate "glob:/blog/**"

# Invalidate entries rendered in the last week
stati invalidate age:1week

# Clear all cache (no query)
stati invalidate
```

## Advanced usage

### Environment configuration

Stati reads only `stati.config.ts`, `stati.config.js` or `stati.config.mjs`, so switch settings with environment variables that your config reads:

```bash
# stati.config.ts reads process.env.SITE_URL
SITE_URL=https://staging.example.com stati build
```

`stati build` switches Stati's internal mode to production, but it does **not** set `process.env.NODE_ENV`. If your config branches on `NODE_ENV`, set it yourself (`NODE_ENV=production stati build`), or read the mode with `getEnv()` from `@stati/core` (see [Configuration file](/configuration/file#multi-environment-configuration)).

### CI/CD integration

**GitHub Actions:**

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        env:
          SITE_URL: ${{ secrets.SITE_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}

      - name: Deploy
        run: rsync -av dist/ user@server:/var/www/html/
```

Run the build through your `build` script rather than calling `stati build` directly: the script holds the flags or steps that build the CSS, such as `stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css` for Tailwind or `npm run build:css && stati build` for Sass, and CI runners do not put `node_modules/.bin` on the `PATH` for plain `run:` steps.

**Netlify:**

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

**Vercel:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

## Global options

Every command supports:

- `--help` - Show command help
- `--version` - Show the CLI version

`build`, `dev` and `preview` also accept `--config <path>`; see [Config file location](#config-file-location) for what it actually changes.

### Version information

```bash
# Show Stati CLI version
stati --version

# Show help for any command
stati --help
stati build --help
stati dev --help
```

## Configuration options

### Config file location

Stati looks for one of these files, in this order, and uses the first it finds:

```text
stati.config.ts   # TypeScript config
stati.config.js   # JavaScript config
stati.config.mjs  # ES module config
```

If none exists, Stati builds with its defaults (site title "My Stati Site", base URL `http://localhost:3000`). If the file exists but fails to load (for example, a syntax error), the error is printed, followed by "Falling back to default configuration.", and the build continues with those defaults, so read the output when a build looks wrong. Validation errors are the exception: an option Stati does not know (such as Stati 1's `eta`), `helpers` that are not functions, and invalid `isg` or `images` settings stop the build with an error that names the setting.

`--config` does not select a file by name:

- `stati build --config path/to/stati.config.ts` uses only the **directory** of the path and loads the standard file name from it. `--config stati.staging.js` is ignored and `./stati.config.*` is used.
- `stati dev` takes its port, host and the folders it serves and watches from `./stati.config.*`, but builds pages with the config in the `--config` path's directory, so the two can differ. `stati preview` ignores `--config`.
- `srcDir`, `outDir`, `staticDir` and the `.stati/` cache are resolved from the current directory in every case.

Run commands from the project root, and keep one config file per project; switch environments with environment variables instead of separate config files.

## Development workflows

### Live reload

The development server automatically rebuilds affected pages and refreshes the browser. Terminal output shows the changed path and how long the rebuild took:

```text
▸ site/blog/post.md rebuilt
   Done in 120ms
▸ site/layout.eta changed
   12/12 pages rebuilt in 340ms
▸ site/partials/banner.eta changed
   No page uses it
```

A template change rebuilds the pages that rendered it, and adding or deleting a template rebuilds the pages whose template names now find a different file; a template no page uses rebuilds nothing. A Markdown change rebuilds the page, the pages that list it, and the pages that render the navigation when it changed; a deleted page's HTML is removed. Changes to `stati.config.*` are not watched; restart `stati dev` after editing the config.

### Preview builds

Preview production builds locally:

```bash
# Build and serve
stati build && stati preview

# Or use npx serve
stati build && npx serve dist

```

### Debugging

- During `stati dev`, any build failure shows a browser overlay with the stack trace and file location.
- The terminal logs which file triggered the rebuild (for example, `▸ site/docs/api.md rebuilt`, then `Done in 92ms`).
- Run `stati build --clean` to regenerate everything from scratch if cached output looks stale.

## Scripting and automation

### npm scripts

Common npm script patterns:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview",
    "clean": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true});require('node:fs').rmSync('.stati',{recursive:true,force:true})\"",
    "fresh": "npm run clean && npm run build",
    "deploy": "npm run build && rsync -av dist/ server:/path/",
    "invalidate": "stati invalidate tag:blog"
  }
}
```

### Bash scripts

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Building site..."
stati build --clean

echo "Optimizing images..."
find dist -name "*.jpg" -exec jpegoptim --strip-all {} \;
find dist -name "*.png" -exec optipng -o7 {} \;

echo "Deploying..."
rsync -av --delete dist/ user@server:/var/www/html/

echo "Invalidating CDN..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/purge_cache" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

echo "Deployment complete!"
```

### Makefile

```makefile
# Makefile
.PHONY: dev build deploy clean

dev:
	stati dev --open

build:
	stati build --clean

deploy: build
	rsync -av dist/ user@server:/var/www/html/

clean:
	rm -rf dist .stati

fresh: clean build

invalidate-blog:
	stati invalidate tag:blog

invalidate-all:
	stati invalidate
```

## Error handling

### Common issues

**Port already in use:**

```bash
# Error: Port 3000 is already in use
# Solution: Use different port
stati dev --port 3001
```

**Build failures:**

```bash
# Error: Build failed with template error
# Solution: Check template syntax and rerun a clean build
stati build --clean
```

**Cache corruption:**

A cache manifest Stati cannot read is not an error: the build warns, for example "Cache manifest contains invalid JSON, ignoring existing cache", and renders every page. Nothing needs fixing; the build writes a new manifest.

## Exit codes

Stati uses conventional exit codes:

- `0` - Command completed successfully
- `1` - The command failed, or no command or an unknown command was given

```bash
# Use in scripts
stati build
if [ $? -eq 0 ]; then
  echo "Build successful"
  deploy.sh
else
  echo "Build failed"
  exit 1
fi
```

The Stati CLI is designed to be both simple for basic use and powerful for advanced workflows. Whether you're developing locally, deploying to production, or integrating with CI/CD systems, the CLI provides the tools you need for efficient static site generation.

Next, learn about the [Scaffolder](/cli/scaffolder) for creating new Stati projects, or explore [Development Workflows](/cli/development) for advanced development techniques.
