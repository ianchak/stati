---
title: 'Installation'
description: 'How to install Stati and create your first project.'
---

# Installation

## Prerequisites

- **Node.js** 22.0.0 or higher
- **npm** 8.0.0 or higher (or yarn/pnpm equivalent)

## Interactive Scaffolder

The easiest way to get started with Stati is using the `create-stati` interactive scaffolder.

```bash
npx create-stati
```

This command will launch an interactive setup wizard that guides you through creating a new project. You'll be prompted for:

- **Project name**: The directory for your new site.
- **Styling solution**: Choose between plain CSS, Sass, or Tailwind CSS.
- **Git initialization**: Optionally initialize a new Git repository.

### Command-Line Options

You can also pass command-line arguments to pre-configure the scaffolder and skip some interactive prompts.

```bash
npx create-stati my-site --styling tailwind --git
```

This will:

1. Create a new directory called `my-site`.
2. Set up a basic Stati project with Tailwind CSS.
3. Initialize a Git repository.

Here are the available options:

| Argument | Description |
| --- | --- |
| `[project-name]` | Sets the project directory name. |
| `--styling` | Sets the styling solution (`css`, `sass`, or `tailwind`). |
| `--git` | Initializes a Git repository. |
| `--no-git` | Skips Git initialization. |
| `--template` | Specifies a project template to use (currently only `blank` is available). |


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
- Explore [Core Concepts](/core-concepts/)
