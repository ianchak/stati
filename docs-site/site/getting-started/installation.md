---
title: 'Installation'
description: 'How to install Stati and create your first project.'
order: 2
---

# Installation

## Prerequisites

- **Node.js** 22.12.0 or higher on the 22.x line, or 24 and later
- **A package manager**: npm, pnpm, yarn or bun

## Interactive scaffolder

The easiest way to get started with Stati is using the `create-stati` interactive scaffolder.

```bash
npx create-stati
```

This command will launch an interactive setup wizard that guides you through creating a new project. You'll be prompted for:

- **Project name**: The directory for your new site.
- **Template**: Start from the `blank`, `blog` or `docs` template.
- **Styling solution**: Choose between plain CSS, Sass, or Tailwind CSS.
- **TypeScript**: On by default, with a typed `stati.config.ts` and esbuild-compiled client code. Answer no for a JavaScript project.
- **Image tools**: Off by default. Answer yes to add `@stati/images` for responsive images and link preview cards.
- **Agent skill**: Optionally install the Stati agent skill for AI coding assistants.
- **Git initialization**: Optionally initialize a new Git repository.
- **Dependency installation**: Choose whether to install dependencies automatically.
- **Package manager**: Select your preferred package manager (npm, yarn, pnpm, or bun) if multiple are available.

### Command-line options

You can also pass command-line arguments to pre-configure the scaffolder and skip some interactive prompts.

```bash
npx create-stati my-site --styling tailwind
```

This creates a project in `my-site` with Tailwind CSS and asks only the remaining questions (template, TypeScript, image tools, agent skill, Git, dependency installation and, when several are detected, the package manager). To skip every prompt, see [Running without prompts](/cli/scaffolder#running-without-prompts).

Here are the available options:

| Argument | Description |
| --- | --- |
| `[project-name]` | Sets the project directory name. |
| `--styling` | Sets the styling solution (`css`, `sass`, or `tailwind`). |
| `--typescript`, `--ts` | Uses TypeScript (the default). |
| `--no-typescript`, `--no-ts` | Uses JavaScript instead of TypeScript. |
| `--no-git` | Skips Git initialization (default: initializes Git). |
| `--no-install` | Skips dependency installation (default: installs dependencies). |
| `--package-manager` | Specifies the package manager to use (`npm`, `yarn`, `pnpm`, or `bun`). |
| `--template` | Specifies a project template to use (`blank`, `blog` or `docs`). |
| `--images` | Adds image tools: responsive images and link preview cards with `@stati/images`. |
| `--no-images` | Skips image tools (the default). |
| `--agent-skill [target]` | Installs the Stati agent skill with the [`skills` CLI](/cli/scaffolder#agent-skill) (`claude` or `agents`; default `claude`). |
| `--no-agent-skill` | Skips agent skill installation. |

### TypeScript by default

New projects use TypeScript unless you opt out:

```bash
npx create-stati my-site
```

This creates a project with:

- `stati.config.ts` - Type-safe configuration file
- `tsconfig.json` - TypeScript compiler configuration
- `src/main.ts` - Entry point for client-side TypeScript code

Stati compiles your TypeScript files from `src/` using esbuild. Run `npm run typecheck` to validate your TypeScript code. Learn more in the [TypeScript configuration guide](/configuration/typescript).

For a JavaScript project instead, pass `--no-typescript` (you get `stati.config.js` and no `src/` entry point).

> **Tip:** If you choose Tailwind CSS, the scaffolder sets up Stati's built-in Tailwind integration in the dev and build scripts. `stati dev` runs the dev server and Tailwind watcher in a single process, and `stati build` runs Tailwind after the pages and names the stylesheet after its content, so you need no separate CSS scripts or process managers.

## Manual installation

If you prefer to set up Stati manually:

```bash
# Create a new directory
mkdir my-stati-site
cd my-stati-site

# Initialize npm
npm init -y

# Install Stati
npm install --save-dev @stati/cli @stati/core

# Create basic structure
mkdir site public
echo '# Hello Stati' > site/index.md
```

Create a `stati.config.js` file:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
  },
});
```

Add scripts to your `package.json` (and ensure `"type": "module"` for ESM imports):

```json
{
  "type": "module",
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview"
  }
}
```

### Optional: image tools

Stati sizes and lazy-loads your images without extra packages. For responsive AVIF and WebP images and an Open Graph image for every page, install `@stati/images` and turn the features on in your config:

```bash
npm install --save-dev @stati/images
```

See [Images](/configuration/images) for the options.

## Verification

To verify your installation works:

```bash
# Start the development server
npm run dev

# Build the site
npm run build

# Preview the built site
npm run preview
```

The development server runs at `http://localhost:3000` and the preview server at `http://localhost:4000`.

## Next steps

- Learn about the [Project Structure](/getting-started/project-structure)
- Follow the [quick start](/getting-started/quick-start)
- Explore [core concepts](/core-concepts/overview)
