---
title: 'Scaffolder'
description: 'Interactive scaffolding tool to quickly set up new Stati projects.'
order: 2
---

# Scaffolder (create-stati)

The `create-stati` package provides an interactive scaffolding tool to quickly set up new Stati projects with styling options.

## Quick Start

```bash
# Interactive setup
npm create stati my-site

# Non-interactive with options
npm create stati my-site --template=blank --styling=tailwind
```

Running the scaffolder will:

- Create a new project directory (or reuse the provided `--dir` target)
- Copy the blank starter template files into that directory
- Update `package.json` with your project name and Stati metadata
- Set up optional styling scripts based on the chosen styling option
- Initialize a Git repository by default (use `--no-git` to skip)
- Install dependencies automatically when enabled (defaults to prompt)

> **Note:** You can skip automatic dependency installation with `--no-install` and install them manually later.
>
> **Non-Interactive Mode:** When using CLI flags (non-interactive mode), dependencies are installed by default using `npm`. Use `--package-manager` to specify a different package manager (yarn, pnpm, or bun).

## Interactive Setup

The scaffolder will prompt you for:

1. **Project name** - Name for your new Stati site
2. **Styling solution** - Choose between CSS, Sass, or Tailwind CSS
3. **Git initialization** - Whether to initialize a Git repository
4. **Dependency installation** - Whether to install dependencies automatically
5. **Package manager** - Which package manager to use (if multiple are detected)

## Command Line Options

```bash
npx create-stati <project-name> [options]

Options:
  --template <name>        Template to use (currently: blank)
  --styling <type>         CSS solution (css|sass|tailwind)
  --no-git                 Skip git initialization (default: initializes Git)
  --no-install             Skip dependency installation (default: installs dependencies)
  --package-manager <pm>   Package manager to use (npm|yarn|pnpm|bun)
  --help, -h               Show help message
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

- Generates a `tailwind.config.js` tailored to the Stati content directory
- Adds a source stylesheet at `src/styles.css` compiled to `public/styles.css`
- Configures `build:css` and `watch:css` scripts that run the Tailwind CLI alongside Stati

## Post-Creation Setup

After creating your site:

```bash
cd my-site
npm install  # Skip if you installed dependencies during setup
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

- Node.js 22+
- npm, yarn, pnpm, or bun

## Next Steps

- Start the development server: `npm run dev`
- Add content to the `site/` directory
- Customize the layout in `site/layout.eta`
- Configure your site in `stati.config.js`
