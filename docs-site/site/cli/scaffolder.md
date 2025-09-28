---
title: 'Scaffolder (create-stati)'
description: 'Interactive scaffolding tool to quickly set up new Stati projects.'
---

# Scaffolder (create-stati)

The `create-stati` package provides an interactive scaffolding tool to quickly set up new Stati projects with styling options.

## Quick Start

```bash
# Interactive setup
npm create stati my-site

# Non-interactive with options
npm create stati my-site --template=blank --styling=tailwind --git
```

## Interactive Setup

The scaffolder will prompt you for:

1. **Project name** - Name for your new Stati site
2. **Styling solution** - Choose between CSS, Sass, or Tailwind CSS
3. **Git initialization** - Whether to initialize a Git repository

## Command Line Options

```bash
npx create-stati <project-name> [options]

Options:
  --template <name>     Template to use (currently: blank)
  --styling <type>      CSS solution (css|sass|tailwind)
  --git                 Initialize git repository
  --no-git              Skip git initialization
  --help, -h            Show help message
```

## Project Templates

### Blank Template

Currently, Stati provides one template:

- **blank** - Minimal starter with basic structure and example content

**What's included:**

- Basic site structure (`site/`, `public/`)
- Example homepage and layout
- Configuration file with sensible defaults
- Package.json with development scripts

## Styling Solutions

Choose your preferred styling approach:

### CSS (Default)

- Basic CSS file in `public/styles.css`
- No preprocessing or build step required

### Sass

- SCSS support with build scripts
- Automatic compilation during development and build

### Tailwind CSS

- Full Tailwind CSS setup with configuration
- Includes typography plugin
- Optimized build pipeline

## Post-Creation Setup

After creating your site:

```bash
cd my-site
npm install
npm run dev
```

## Package Scripts

All created projects include these scripts:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview",
    "clean": "rimraf dist .stati"
  }
}
```

## Generated Project Structure

```text
my-site/
├── site/
│   ├── index.md          # Homepage content
│   └── layout.eta        # Main layout template
├── public/
│   ├── styles.css        # Stylesheet (varies by styling choice)
│   └── favicon.svg       # Site icon
├── stati.config.js       # Stati configuration
├── package.json          # Node.js project file
└── README.md            # Getting started guide
```

## Requirements

- Node.js 18+
- npm, yarn, pnpm, or bun

## Next Steps

- Start the development server: `npm run dev`
- Add content to the `site/` directory
- Customize the layout in `site/layout.eta`
- Configure your site in `stati.config.js`
