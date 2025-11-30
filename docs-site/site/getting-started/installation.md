---
title: 'Installation'
description: 'How to install Stati and create your first project.'
order: 2
---

# Installation

## Prerequisites

- **Node.js** 22.0.0 or higher
- **npm** 11.5.1 or higher (or yarn/pnpm equivalent)

## Interactive Scaffolder

The easiest way to get started with Stati is using the `create-stati` interactive scaffolder.

```bash
npx create-stati
```

This command will launch an interactive setup wizard that guides you through creating a new project. You'll be prompted for:

- **Project name**: The directory for your new site.
- **Styling solution**: Choose between plain CSS, Sass, or Tailwind CSS.
- **TypeScript**: Optionally enable TypeScript support with esbuild compilation.
- **Git initialization**: Optionally initialize a new Git repository.
- **Dependency installation**: Choose whether to install dependencies automatically.
- **Package manager**: Select your preferred package manager (npm, yarn, pnpm, or bun) if multiple are available.

### Command-Line Options

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
| `--typescript`, `--ts` | Enables TypeScript support with esbuild compilation. |
| `--no-git` | Skips Git initialization (default: initializes Git). |
| `--no-install` | Skips dependency installation (default: installs dependencies). |
| `--package-manager` | Specifies the package manager to use (`npm`, `yarn`, `pnpm`, or `bun`). |
| `--template` | Specifies a project template to use (currently only `blank` is available). |

### TypeScript Quick Start

Create a Stati project with TypeScript enabled:

```bash
npx create-stati my-ts-site --typescript
```

This creates a project with:

- `stati.config.ts` - Type-safe configuration file
- `tsconfig.json` - TypeScript compiler configuration
- `src/main.ts` - Entry point for your TypeScript code

Run `npm run typecheck` to validate your TypeScript code. Learn more in the [TypeScript configuration guide](/configuration/typescript/).

> **Tip:** If you choose Tailwind CSS, the scaffolder sets up Stati's built-in Tailwind integration in the dev script. This runs both the dev server and Tailwind watcher in a single process—no need for separate build scripts or process managers!

## Manual Installation

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

Add scripts to your `package.json`:

```json
{
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

## Next Steps

- Learn about the [Project Structure](/getting-started/project-structure/)
- Follow the [Quick Start Guide](/getting-started/quick-start/)
- Explore [Core Concepts](/core-concepts/overview/)
