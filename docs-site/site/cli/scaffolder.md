---
title: 'Scaffolder (create-stati)'
description: 'Learn how to use create-stati to scaffold new Stati projects with the blank template and styling configurations.'
---

# Scaffolder (create-stati)

The `create-stati` package provides an interactive scaffolding tool to quickly set up new Stati projects with best practices and styling options.

## Quick Start

Create a new Stati project:

```bash
# Using npm
npm create stati my-site

# Using yarn
yarn create stati my-site

# Using pnpm
pnpm create stati my-site

# Using bun
bun create stati my-site
```

## Interactive Setup

The scaffolder provides an interactive setup process:

```bash
$ npm create stati my-site

Welcome to Stati
Create a new static site with Stati

? Project name: my-site
? Choose a template:
  ❯ Blank - Minimal starter template
? Which CSS solution would you like?
  ❯ Plain CSS (recommended for beginners)
    Sass/SCSS
    Tailwind CSS
? Initialize a git repository? Yes

Creating Stati project...
✅ Successfully created Stati project 'my-site'

Next steps:
  cd my-site
  npm install
  npm run dev

🌟 Happy building with Stati!
```

## Command Line Options

Skip the interactive prompts with command line options:

```bash
# Create with specific options
npm create stati my-site -- --styling tailwind --git

# Skip git initialization
npm create stati my-site -- --no-git

# Show help
npm create stati -- --help
```

### Available Options

```bash
Options:
  --template <name>        Template to use (blank)
  --styling <type>         CSS solution (css|sass|tailwind)
  --git                    Initialize git repository
  --no-git                 Skip git initialization
  --help, -h               Show this help message

Examples:
  create-stati my-site
  create-stati my-blog --styling=sass --git
  create-stati my-app --template=blank --styling=tailwind
```

## Project Templates

### Blank Template

Currently, Stati supports one template:

**Blank Template** - A minimal starter with essential files and configuration:

```bash
npm create stati my-site -- --template blank --styling css
```

**Features:**

- Minimal setup
- Basic layout structure
- Essential configuration
- Sample content
- Development scripts

**Generated Structure:**

```text
my-site/
├── site/
│   ├── index.md          # Homepage
│   └── layout.eta        # Main layout
├── public/
│   ├── styles.css        # Stylesheet
│   └── favicon.svg       # Site icon
├── stati.config.js       # Configuration
├── package.json          # Dependencies and scripts
└── README.md            # Getting started guide
```

## Styling Solutions

### CSS (Plain CSS)

Basic CSS setup with modern features:

```css
/* public/styles.css */
:root {
  --primary-color: #3b82f6;
  --text-color: #1f2937;
  --bg-color: #ffffff;
}

body {
  font-family: system-ui, sans-serif;
  color: var(--text-color);
  background: var(--bg-color);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
```

### Sass/SCSS

Enhanced CSS preprocessing with variables, mixins, and nesting:

**Generated Files:**

- `styles/main.scss` - Main Sass source file with variables and mixins
- `public/styles.css` - Compiled output (auto-generated)

**Generated Package Scripts:**

```json
{
  "scripts": {
    "dev": "concurrently --prefix none \"npm run watch:css\" \"stati dev\"",
    "build": "npm run build:css && stati build",
    "build:css": "sass styles/main.scss public/styles.css --style=compressed",
    "watch:css": "sass styles/main.scss public/styles.css --watch"
  }
}
```

**Dependencies Added:**

- `sass: ^1.77.0` - Sass compiler
- `concurrently: ^9.0.0` - Run multiple commands simultaneously

### Tailwind CSS

Utility-first CSS framework:

```javascript
### Tailwind CSS

Utility-first CSS framework:

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./site/**/*.{md,eta,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
```

**Usage in Templates:**

```html
<article class="max-w-4xl mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-4xl font-bold text-gray-900 mb-4"><%= page.title %></h1>
    <p class="text-lg text-gray-600"><%= page.description %></p>
  </header>

  <div class="prose prose-lg max-w-none"><%~ content %></div>
</article>
**Usage in Templates:**

```html
<article class="max-w-4xl mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-4xl font-bold text-gray-900 mb-4"><%= page.title %></h1>
    <p class="text-lg text-gray-600"><%= page.description %></p>
  </header>

  <div class="prose prose-lg max-w-none"><%~ content %></div>
</article>
```

## Post-Creation Setup

After creating your project:

1. **Install dependencies:**

   ```bash
   cd my-site
   npm install
   ```

2. **Start development:**

   ```bash
   npm run dev
   ```

3. **Build for production:**

   ```bash
   npm run build
   ```

4. **Preview built site:**

   ```bash
   npm run preview
   ```

## Package Scripts

The scaffolder generates these npm scripts:

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

**Additional scripts for styling:**

**Sass:**

```json
{
  "scripts": {
    "dev": "concurrently --prefix none \"npm run watch:css\" \"stati dev\"",
    "build": "npm run build:css && stati build",
    "build:css": "sass styles/main.scss public/styles.css --style=compressed",
    "watch:css": "sass styles/main.scss public/styles.css --watch"
  }
}
```

**Tailwind:**

```json
{
  "scripts": {
    "dev": "concurrently --prefix none \"npm run watch:css\" \"stati dev\"",
    "build": "npm run build:css && stati build",
    "build:css": "tailwindcss -i src/styles.css -o public/styles.css --minify",
    "watch:css": "tailwindcss -i src/styles.css -o public/styles.css --watch"
  }
}
```


## Next Steps

- [Learn about project structure](/getting-started/project-structure/)
- [Configure your site](/configuration/)
- [Add content](/core-concepts/content/)
- [Deploy your site](/deployment/)
