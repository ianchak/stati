---
title: 'CLI Commands'
description: 'Learn about Stati command-line interface and available commands.'
---

# CLI Commands

Stati provides a simple and powerful command-line interface for building, developing, and managing your static sites. The CLI is designed to be intuitive while providing advanced options for complex workflows.

## Available Commands

### `stati dev`

Start the development server with hot reload and incremental builds.

```bash
stati dev [options]
```

**Options:**

- `--port <port>` - Port to run the server on (default: 3000)
- `--host <host>` - Host to bind to (default: localhost)
- `--open` - Open browser automatically
- `--config <file>` - Custom config file path

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

### `stati build`

Build your site for production.

```bash
stati build [options]
```

**Options:**

- `--clean` - Clean output directory before build
- `--force` - Force rebuild (ignore cache)
- `--include-drafts` - Include pages marked with `draft: true` in the build
- `--config <file>` - Custom config file path

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

Invalidate ISG cache entries.

```bash
stati invalidate [query]
```

**Query Patterns:**

- `tag:name` - Invalidate by tag
- `path:/route` - Invalidate specific path
- `age:duration` - Invalidate by age (e.g., `3months`, `1week`)
- Empty query - Clear all cache

**Examples:**

```bash
# Invalidate all content with 'blog' tag
stati invalidate tag:blog

# Invalidate specific path
stati invalidate path:/about

# Invalidate content older than 1 week
stati invalidate age:1week

# Clear all cache (no query)
stati invalidate
```

### `stati preview`

Preview your production build locally.

```bash
stati preview [options]
```

**Options:**

- `--port <port>` - Port to run the server on (default: 4000)
- `--host <host>` - Host to bind to (default: localhost)
- `--open` - Open browser automatically
- `--config <file>` - Custom config file path

**Examples:**

```bash
# Preview built site
stati preview

# Preview on custom port
stati preview --port 8080

# Open browser automatically
stati preview --open
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
          node-version: '18'
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
  NODE_VERSION = "18"
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

All commands support these global options:

- `--config <path>` - Path to configuration file
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

# Default config file locations
stati.config.js  # Primary config
stati.config.ts  # TypeScript config
```

## Development Workflows

### Hot Reload

The development server provides intelligent hot reloading:

```bash
stati dev --verbose

# Output shows what triggers rebuilds:
# 🔄 Watching for changes...
#
# File changed: blog/post-1.md
# ├── Rebuilding: /blog/post-1/
# ├── Rebuilding: /blog/ (depends on post-1.md)
# └── ✅ Rebuilt 2 pages in 0.1s
#
# File changed: layout.eta
# ├── Rebuilding: affected pages (89 found)
# └── ✅ Rebuilt 89 pages in 1.2s
```

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

Enable debug mode for troubleshooting:

```bash
# Debug mode
DEBUG=stati:* stati build

# Specific debug categories
DEBUG=stati:cache stati build
DEBUG=stati:markdown stati build
DEBUG=stati:templates stati build

# Save debug output
DEBUG=stati:* stati build 2> debug.log
```

## Scripting and Automation

### npm Scripts

Common npm script patterns:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati build && serve dist",
    "clean": "rm -rf dist .stati/cache",
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
stati build --clean --verbose

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
	rm -rf dist .stati/cache

fresh: clean build

invalidate-blog:
	stati invalidate tag:blog

invalidate-all:
	stati invalidate all
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
# Solution: Check template syntax and run with verbose output
stati build --verbose
```

**Cache corruption:**

```bash
# Error: Cache manifest corrupted
# Solution: Clean cache and rebuild
stati build --clean
```

### Verbose Output

Use verbose mode to diagnose issues:

```bash
stati build --verbose

# Shows detailed information:
# 📁 Scanning content files...
# ├── Found 127 markdown files
# ├── Found 23 template files
# └── Found 8 asset files
#
# 🔍 Analyzing dependencies...
# ├── blog/index.md depends on 34 files
# ├── docs/index.md depends on 12 files
# └── Generated dependency graph with 156 edges
#
# 🏗️ Building pages...
# ├── Processing: / (0.1s)
# ├── Processing: /blog/ (0.3s)
# ├── Processing: /docs/ (0.2s)
# └── ✅ Built 127 pages in 2.3s
```

## Exit Codes

Stati uses standard exit codes for scripting:

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Build error
- `4` - Template error
- `5` - Cache error

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

Next, learn about the [Scaffolder](/cli/scaffolder/) for creating new progetti Stati projects, or explore [Development Workflows](/cli/development/) for advanced development techniques.
