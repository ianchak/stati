---
title: 'Commands'
description: 'Learn about Stati command-line interface and available commands.'
order: 1
---

# CLI Commands

Stati provides a simple and powerful command-line interface for building, developing, and managing your static sites. The CLI is designed to be intuitive while providing advanced options for complex workflows.

## Requirements

- Node.js 22 or higher
- npm 11.5.1 or higher

## Available Commands

### `stati dev`

Start development server with hot reload and incremental builds.

```bash
stati dev [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | number | 3000 | Port to run the dev server on |
| `--host` | string | localhost | Host to bind the dev server to |
| `--open` | boolean | false | Open browser after starting server |
| `--config` | string | - | Path to config file |

**Examples:**

```bash
# Basic development server
stati dev

# Custom port and host
stati dev --port 8080 --host 0.0.0.0

# Open browser automatically
stati dev --open

# Custom config file
stati dev --config stati.staging.js
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
| `--config` | string | - | Path to config file |

**Examples:**

```bash
# Basic preview
stati preview

# Custom port and host
stati preview --port 8080 --host 0.0.0.0

# Open browser automatically
stati preview --open

# Custom config file
stati preview --config stati.prod.js
```

### `stati build`

Build site for production.

```bash
stati build [options]
```

**Options:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--force` | boolean | false | Force full rebuild without deleting cache |
| `--clean` | boolean | false | Clean cache before building |
| `--config` | string | - | Path to config file |
| `--include-drafts` | boolean | false | Include draft pages in the build |

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
```

### `stati invalidate`

Invalidate cache entries by tag, path, pattern, or age.

```bash
stati invalidate [query]
```

**Query Patterns:**

| Pattern | Format | Example | Description |
|---------|--------|---------|-------------|
| Tag | `tag:value` | `tag:blog` | Invalidate by tag |
| Path | `path:/route` | `path:/about` | Invalidate specific path or nested routes |
| Glob | `glob:pattern` | `glob:blog/**` | Invalidate paths matching glob expressions |
| Age | `age:duration` | `age:1week` | Invalidate entries rendered within specified time window (uses calendar arithmetic) |
| Clear All | (empty) | `stati invalidate` | Clear entire cache |

**Examples:**

```bash
# Invalidate all content with 'blog' tag
stati invalidate tag:blog

# Invalidate specific path
stati invalidate path:/about

# Invalidate paths matching glob pattern
stati invalidate glob:blog/**

# Invalidate entries rendered in the last week
stati invalidate age:1week

# Clear all cache (no query)
stati invalidate
```

## Advanced Usage

### Environment Configuration

Use environment-specific configuration:

```bash
# Development with custom config
NODE_ENV=development stati dev --config stati.dev.js

# Production build with staging config
NODE_ENV=production stati build --config stati.staging.js

# Environment variables in config
SITE_URL=https://staging.example.com stati build
```

### CI/CD Integration

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
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: stati build
        env:
          SITE_URL: ${{ secrets.SITE_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}

      - name: Deploy
        run: rsync -av dist/ user@server:/var/www/html/
```

**Netlify:**

```bash
# netlify.toml
[build]
  command = "stati build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

**Vercel:**

```json
{
  "buildCommand": "stati build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

## Global Options

Most commands support these options:

- `--config <path>` - Path to configuration file (supported by `build`, `dev`, and `preview`)
- `--help` - Show command help
- `--version` - Show version information

### Version Information

```bash
# Show Stati CLI version
stati --version

# Show help for any command
stati --help
stati build --help
stati dev --help
```

## Configuration Options

### Configuration Files

Stati uses project-specific configuration files:

```bash
# Use custom config file
stati dev --config stati.dev.js
stati build --config stati.prod.js

# Default config file locations (searched in this order)
stati.config.ts   # TypeScript config
stati.config.js   # JavaScript config
stati.config.mjs  # ES Module config
```

## Development Workflows

### Hot Reload

The development server automatically rebuilds affected pages and refreshes the browser. Terminal output shows the changed path and how long the rebuild took:

```bash
$ stati dev

⚡ site/blog/post.md rebuilt in 120ms
⚡ site/layout.eta rebuilt in 340ms
```

Template or partial changes invalidate dependent pages in the cache before the rebuild so those pages always render with the latest layout.

### Preview Builds

Preview production builds locally:

```bash
# Build and serve
stati build && stati preview

# Or use npx serve
stati build && npx serve dist

# Or with custom server
stati build && python -m http.server 8080 --directory dist
```

### Debugging

- During `stati dev`, any build failure shows a browser overlay with the stack trace and file location.
- The terminal logs which file triggered the rebuild (for example, `⚡ site/docs/api.md rebuilt in 92ms`).
- Run `stati build --clean` to regenerate everything from scratch if cached output looks stale.

## Scripting and Automation

### npm Scripts

Common npm script patterns:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati build && serve dist",
    "clean": "rm -rf dist .stati",
    "fresh": "npm run clean && npm run build",
    "deploy": "npm run build && rsync -av dist/ server:/path/",
    "invalidate": "stati invalidate tag:blog"
  }
}
```

### Bash Scripts

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

## Error Handling

### Common Issues

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

```bash
# Error: Cache manifest corrupted
# Solution: Clean cache and rebuild
stati build --clean
```

## Exit Codes

Stati uses conventional exit codes:

- `0` - Command completed successfully
- `1` - An error occurred (build failure, invalid command, etc.)

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

Next, learn about the [Scaffolder](/cli/scaffolder/) for creating new Stati projects, or explore [Development Workflows](/cli/development/) for advanced development techniques.
