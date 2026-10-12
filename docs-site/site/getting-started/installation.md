---
title: 'Installation'
description: 'How to install Stati and create your first project.'
order: 2
---

# Installation

## Prerequisites

- **Node.js** 22.0.0 or higher
- **A package manager**: npm, pnpm, yarn or bun

## Interactive scaffolder

The easiest way to get started with Stati is using the `create-stati` interactive scaffolder.

```bash
npx create-stati
```

This command will launch an interactive setup wizard that guides you through creating a new project. You'll be prompted for:

- **Project name**: The directory for your new site.
- **Styling solution**: Choose between plain CSS, Sass, or Tailwind CSS.
- **TypeScript**: On by default, with a typed `stati.config.ts` and esbuild-compiled client code. Answer no for a JavaScript project.
- **Git initialization**: Optionally initialize a new Git repository.
- **Dependency installation**: Choose whether to install dependencies automatically.
- **Package manager**: Select your preferred package manager (npm, yarn, pnpm, or bun) if multiple are available.

### Command-line options

You can also pass command-line arguments to pre-configure the scaffolder and skip some interactive prompts.

```bash
npx create-stati my-site --styling tailwind
```

This will:

1. Create a new directory called `my-site`.
2. Set up a basic Stati project with Tailwind CSS.
3. Initialize a Git repository (default behavior).

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
| `--template` | Specifies a project template to use (currently only `blank` is available). |

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

> **Tip:** If you choose Tailwind CSS, the scaffolder sets up Stati's built-in Tailwind integration in the dev script. This runs both the dev server and Tailwind watcher in a single process - no need for separate build scripts or process managers!

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

Your site should be available at `http://localhost:3000`.

## Next steps

- Learn about the [Project Structure](/getting-started/project-structure)
- Follow the [quick start](/getting-started/quick-start)
- Explore [core concepts](/core-concepts/overview)
