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

- `--port, -p <port>` - Port to run the server on (default: 3000)
- `--host <host>` - Host to bind to (default: localhost)
- `--open` - Open browser automatically
- `--https` - Use HTTPS in development
- `--config <file>` - Custom config file path

**Examples:**

```bash
# Basic development server
stati dev

# Custom port
stati dev --port 8080

# Open browser and use HTTPS
stati dev --open --https

# Custom config file
stati dev --config stati.staging.js
```

### `stati build`

Build your site for production.

```bash
stati build [options]
```

**Options:**

- `--output, -o <dir>` - Output directory (default: dist)
- `--clean` - Clean output directory before build
- `--force` - Force rebuild (ignore cache)
- `--config <file>` - Custom config file path
- `--verbose` - Detailed build output
- `--analyze` - Generate bundle analysis

**Examples:**

```bash
# Basic build
stati build

# Clean build with verbose output
stati build --clean --verbose

# Force rebuild ignoring cache
stati build --force

# Build to custom directory
stati build --output public
```

### `stati invalidate`

Invalidate ISG cache entries.

```bash
stati invalidate <target> [options]
```

**Targets:**

- `path:<path>` - Invalidate specific path
- `tag:<tag>` - Invalidate by tag
- `age:<duration>` - Invalidate by age
- `all` - Invalidate everything

**Options:**

- `--dry-run` - Show what would be invalidated
- `--verbose` - Detailed output
- `--config <file>` - Custom config file path

**Examples:**

```bash
# Invalidate specific page
stati invalidate path:/blog/post-1/

# Invalidate by tag
stati invalidate tag:blog

# Invalidate old content
stati invalidate age:30d

# Dry run to see what would be invalidated
stati invalidate tag:blog --dry-run

# Invalidate multiple targets
stati invalidate path:/blog/ tag:navigation
```

## Advanced Usage

### Build Statistics

Get detailed build information:

```bash
# Show build stats
stati build --analyze

# Output:
# ✅ Build completed in 2.34s
#
# Pages:
# ├── Total: 127 pages
# ├── Generated: 45 pages
# ├── Cached: 82 pages
# └── Cache hit rate: 64.6%
#
# Assets:
# ├── CSS: 3 files (45.2 KB)
# ├── JS: 7 files (128.7 KB)
# ├── Images: 23 files (2.1 MB)
# └── Other: 8 files (156.3 KB)
#
# Bundle Analysis:
# ├── main.js: 45.2 KB
# ├── vendor.js: 83.5 KB
# └── styles.css: 45.2 KB
```

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
        run: stati build --verbose
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

## Cache Management

### Cache Commands

Stati provides built-in cache management:

```bash
# View cache statistics
stati cache stats

# Output:
# Cache Statistics:
# ├── Total entries: 127
# ├── Total size: 45.2 MB
# ├── Hit rate: 85.3%
# ├── Oldest entry: 7 days ago
# └── Newest entry: 2 minutes ago

# Show cache dependencies
stati cache deps [path]

# Clean orphaned cache entries
stati cache clean

# Reset all cache
stati cache reset
```

### Advanced Cache Operations

```bash
# Show detailed cache analysis
stati cache analyze

# Output:
# Cache Analysis:
#
# Age Distribution:
# ├── < 1 hour: 23 entries (18.1%)
# ├── 1-24 hours: 45 entries (35.4%)
# ├── 1-7 days: 38 entries (29.9%)
# └── > 7 days: 21 entries (16.5%)
#
# Size Distribution:
# ├── < 1KB: 67 entries (52.8%)
# ├── 1-10KB: 42 entries (33.1%)
# ├── 10-100KB: 16 entries (12.6%)
# └── > 100KB: 2 entries (1.6%)
#
# Dependencies:
# ├── Most dependencies: /blog/ (34 deps)
# ├── Most referenced: layout.eta (89 refs)
# └── Orphaned entries: 3
```

## Configuration Options

### CLI Configuration File

Create `.stati/cli-config.json` for persistent CLI settings:

```json
{
  "dev": {
    "port": 3000,
    "open": true,
    "host": "localhost"
  },
  "build": {
    "clean": true,
    "verbose": false
  },
  "cache": {
    "autoClean": true,
    "maxSize": "500MB"
  }
}
```

### Global Configuration

Install Stati globally for system-wide defaults:

```bash
# Install globally
npm install -g @stati/cli

# Set global defaults
stati config set dev.port 8080
stati config set build.clean true

# View global config
stati config list
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
# Solution: Reset cache
stati cache reset
stati build
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
