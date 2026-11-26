---
title: 'Commands'
description: 'The stati dev, preview, build and invalidate commands: their options, cache queries, config loading and exit codes.'
order: 1
seo:
  title: 'Stati CLI commands'
---

# Commands

The `stati` command builds, serves and previews your site, and manages its cache.

## Running Stati commands

Install `@stati/cli` as a dev dependency, then run `stati` through your `package.json` scripts:

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

```bash
npm run dev
npm run invalidate -- "tag:blog"  # Pass arguments after --
```

Or run it with `npx`, for example `npx stati build --clean`. `npx stati` runs the `stati` binary from your project's `@stati/cli`; in a folder without it, npx downloads the unrelated npm package named `stati` instead, so call the CLI by its package name there: `npx @stati/cli build`.

The examples below write commands as `stati <command>`.

## Available commands

### `stati dev`

Start development server with live reload and incremental builds.

```bash
stati dev [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | number | `dev.port`, else 3000 | Port to run the dev server on |
| `--host` | string | `dev.host`, else localhost | Host to bind the dev server to |
| `--open` | boolean | `dev.open`, else false | Open browser after starting server |
| `--tailwind-input` | string | - | Input file path for Tailwind CSS watcher; needs `--tailwind-output`, and with only one of the two no watcher starts |
| `--tailwind-output` | string | - | Output file path for compiled Tailwind CSS; pages link it when it is a `.css` file in the output directory (see [CSS](/configuration/css)) |
| `--tailwind-verbose` | boolean | false | Show all Tailwind CSS output (default shows errors only) |

**Examples:**
```bash
# Listen on every interface, on port 8080
stati dev --port 8080 --host 0.0.0.0

# With Tailwind CSS
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

One dev server runs per project folder: a second `stati dev` in the same folder stops with "A dev server is already running in this directory".

### `stati preview`

Start preview server for built site.

```bash
stati preview [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | number | `preview.port`, else 4000 | Port to run the preview server on |
| `--host` | string | `preview.host`, else localhost | Host to bind the preview server to |
| `--open` | boolean | `preview.open`, else false | Open browser after starting server |

The preview server serves `dist/` as built, with no live reload. Extensionless URLs such as `/about` are served from `about.html`, and query strings are ignored, so `/about?ref=nav` serves the same file. A missing file gets your site's `404.html` (from `site/404.md`) with a 404 status, as most static hosts do, or a plain-text 404 when the site has none. `stati dev` serves files the same way, with live reload added to the 404 page. When `site.baseUrl` has a path, both servers serve the site under it (`/docs/`) and redirect `/` there; see [Deploying to a subfolder](/advanced/deploying-to-a-subfolder).

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
| `--include-drafts` | boolean | false | Include draft pages in the build |
| `--metrics` | boolean | false | Enable build metrics collection (also enabled by `STATI_METRICS=1` or `true`) |
| `--metrics-file` | string | - | Metrics JSON file name, resolved inside `.stati/metrics/` (default `build-<timestamp>.json`); with a path outside that folder Stati logs an error and writes the default file. Needs `--metrics` |
| `--metrics-detailed` | boolean | false | Include per-page timing in metrics. Needs `--metrics` |
| `--metrics-html` | boolean | false | Generate HTML report alongside JSON metrics. Needs `--metrics` |
| `--tailwind-input` | string | - | Input file for Tailwind CSS, which runs after the last page renders; needs `--tailwind-output` |
| `--tailwind-output` | string | - | The stylesheet's file in the output directory, such as `dist/styles.css`; unless `css.hash` is `false`, production writes `dist/_assets/<name>-<hash>.css` instead, such as `styles-A1B2C3D4.css` (see [CSS](/configuration/css)) |

**Examples:**

```bash
# Clean build with metrics and an HTML report
stati build --clean --metrics --metrics-html

# Build the Tailwind CSS stylesheet as well
stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

**Removed pages:** `stati build` deletes the HTML of pages that no longer exist, such as a deleted post, but only files `.stati/manifest.json` records, so files from `public/` or other tools stay. See [ISG](/core-concepts/isg#removing-pages-that-no-longer-exist).

**Bundles, stylesheet and search index:** a production build writes TypeScript bundles, the Tailwind stylesheet and the search index under hashed names, and deletes the copies earlier builds wrote under other names: `dist/_assets/<bundleName>-<hash>.js` files and the `<bundleName>.js` and source map `stati dev` writes, for the bundles in your config, `dist/_assets/<name>-<hash>.css` files (the `--tailwind-output` file `stati dev` writes stays), and `dist/<indexName>-<hash>.json`. Files with other names, such as your own files in `public/_assets/`, stay. Files of a bundle you removed from the config stay until you run `stati build --clean`.

**Images:** `stati build` deletes the images it generated in `dist/_img/` that no page uses any more; the dev server doesn't. `--clean` removes the image cache with the rest of `.stati/`, so the next build encodes every image again. See [Images](/configuration/images#caching-and-cleanup).

**Concurrent builds:** a second `stati build` in the same folder waits for the first to finish. After a minute it stops with "Build lock acquisition timed out after 60000ms. Another Stati build process may be running. Use --force to override." `--force` and `--clean` take over the lock.

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
| Invalidate All | (empty) | `stati invalidate` | Invalidate every entry |

A query can hold several terms separated by spaces; an entry is invalidated if it matches **any** of them. To use a value that contains spaces, quote it inside the query, for example `stati invalidate '"tag:release notes" path:/blog'`.

Invalidation marks the entries in `.stati/manifest.json` as out of date, and the pages are re-rendered on the next `stati build`. The entries stay, so that build still removes the HTML of a page you deleted in the meantime.

**Examples:**

```bash
# Invalidate all content with 'blog' tag
stati invalidate tag:blog

# Invalidate /about.html (and every other key that starts with /about)
stati invalidate path:/about

# Invalidate everything under /blog/
stati invalidate "glob:/blog/**"

# Invalidate entries rendered in the last week
stati invalidate age:1week

# Invalidate every entry (no query)
stati invalidate
```

## Advanced usage

### Environment configuration

Stati reads only `stati.config.ts`, `stati.config.js` or `stati.config.mjs`, so switch settings with environment variables that your config reads:

```bash
# stati.config.ts reads process.env.SITE_URL
SITE_URL=https://staging.example.com stati build
```

`stati build` and `stati preview` switch Stati's internal mode to production and `stati dev` to development before they load the config, but none of them sets `process.env.NODE_ENV`. If your config branches on `NODE_ENV`, set it yourself (`NODE_ENV=production stati build`), or read the mode with `getEnv()` from `@stati/core` (see [Configuration file](/configuration/file#multi-environment-configuration)).

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

Unknown options are ignored, so a mistyped flag such as `--frce` does nothing; check the options box the CLI prints when a command starts.

## Config file location

`stati build`, `stati dev` and `stati preview` read the first of `stati.config.ts`, `stati.config.js` and `stati.config.mjs` they find in the current directory and resolve `srcDir`, `outDir` and `staticDir` from it; every command, `stati invalidate` included, uses the `.stati/` cache there. Run commands from the project root.

Without a config file Stati uses its defaults. A config that fails to load, such as one with a syntax error, prints the error followed by "Falling back to default configuration." and the build continues with the defaults, so read the output when a build looks wrong. Invalid settings stop the build with an error that names them. See [Configuration file](/configuration/file#file-name-and-location) for the defaults and the checks.

## Error handling

### Common issues

**Template errors:** a production build logs a failing template, such as `× Error rendering site/layout.eta for /: ...`, writes fallback HTML for that page (or an HTML comment in place of a failing included template) and still exits with `0`. Read the build output before deploying; `stati dev` shows the same error in the browser overlay.

**Cache corruption:** a cache manifest Stati cannot read is not an error. The build warns, for example "Cache manifest contains invalid JSON, ignoring existing cache", renders every page and writes a new manifest; an entry that fails validation is reset with a warning and renders again. Deleting `.stati/` yourself loses the list of HTML files Stati wrote, so the next build can't remove the HTML of pages deleted since; build with `--clean` instead.

## Exit codes

- `0` - The command completed. A build whose templates failed still exits with `0`; see [Common issues](#common-issues).
- `1` - The command failed, or no command or an unknown command was given
