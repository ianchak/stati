---
title: 'Installation'
description: 'How to install Stati and create your first project.'
---

# Installation

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher (or yarn/pnpm equivalent)

## Quick Start

The easiest way to get started with Stati is using the scaffolder:

```bash
npx create-stati my-site
cd my-site
npm run dev
```

This will:

1. Create a new directory called `my-site`
2. Set up a basic Stati project structure
3. Install dependencies
4. Start the development server

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
