---
title: 'Scaffolder (create-stati)'
description: 'Learn how to use create-stati to scaffold new Stati projects with different templates and configurations.'
---

# Scaffolder (create-stati)

The `create-stati` package provides an interactive scaffolding tool to quickly set up new Stati projects with best practices, styling options, and project templates.

## Quick Start

Create a new Stati project:

```bash
# Using npm
npm create stati my-site

# Using yarn
yarn create stati my-site

# Using pnpm
pnpm create stati my-site
```

## Interactive Setup

The scaffolder provides an interactive setup process:

```bash
$ npm create stati my-site

✨ Creating new Stati site: my-site

? Project name: my-site
? Choose a template: blank (more templates coming soon)
? Select styling approach:
  ❯ CSS (Basic stylesheets)
    Sass (Enhanced CSS with variables)
    Tailwind CSS (Utility-first framework)
? Initialize git repository? Yes

🎉 Project created successfully!

Next steps:
  cd my-site
  npm install
  npm run dev
```

## Command Line Options

Skip the interactive prompts with command line options:

```bash
# Create with specific options
npm create stati my-site -- --template blank --styling tailwind --git

# Use all defaults
npm create stati my-site -- --yes

# Show help
npm create stati -- --help
```

### Available Options

```bash
Options:
  --template <name>     Template to use (currently: blank)
  --styling <type>      Styling approach (css, sass, tailwind)
  --git                 Initialize git repository
  --no-git             Skip git initialization
  --yes                 Use all defaults (--template blank --styling css --git)
  --help                Display help information
```

## Project Templates

### Blank Template

A minimal starter with essential files and configuration:

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

```
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

### Future Templates

Additional templates are planned for future releases:

- **Blog** - Blog template with posts, categories, RSS feed
- **Docs** - Documentation template with navigation, search
- **Portfolio** - Portfolio template with project showcases
- **Landing** - Marketing landing page template
- Tag and category support
- RSS feed generation
- SEO optimization
- Dark mode support
- Responsive design

**Structure:**

```
my-blog/
├── site/
│   ├── index.md              # Homepage
│   ├── about.md              # About page
│   ├── layout.eta            # Main layout
│   ├── _partials/
│   │   ├── header.eta
│   │   ├── footer.eta
│   │   └── post-card.eta
│   └── blog/
│       ├── index.md          # Blog listing
│       ├── hello-world.md    # Sample post
│       └── second-post.md
├── public/
│   └── styles.css
└── stati.config.js
```

### Documentation Template

Ideal for technical documentation:

```bash
npm create stati my-docs -- --template docs --styling css
```

**Features:**

- Multi-level navigation
- Search functionality
- Code syntax highlighting
- Table of contents
- Edit on GitHub links
- Mobile-responsive sidebar
- Print styles

**Structure:**

```
my-docs/
├── site/
│   ├── index.md
│   ├── layout.eta
│   ├── _partials/
│   │   ├── sidebar.eta
│   │   ├── breadcrumbs.eta
│   │   └── toc.eta
│   ├── getting-started/
│   │   ├── index.md
│   │   └── installation.md
│   ├── guides/
│   │   └── index.md
│   └── api/
│       └── index.md
└── stati.config.js
```

### Portfolio Template

Showcase your work and skills:

```bash
npm create stati my-portfolio -- --template portfolio --styling sass
```

**Features:**

- Project showcase
- Skills section
- Contact form
- About page
- Resume/CV page
- Image galleries


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

Advanced CSS preprocessing:

```scss
// src/styles.scss
$primary-color: #3b82f6;
$text-color: #1f2937;
$breakpoints: (
  sm: 640px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
);

@mixin respond-to($breakpoint) {
  @media (min-width: map-get($breakpoints, $breakpoint)) {
    @content;
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;

  @include respond-to(md) {
    padding: 0 2rem;
  }
}
```

**Build Configuration:**

```javascript
// package.json scripts
{
  "scripts": {
    "dev": "npm run build:css && stati dev",
    "build": "npm run build:css && stati build",
    "build:css": "sass src/styles.scss public/styles.css"
  }
}
```

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
    "clean": "stati build --clean"
  }
}
```

**Additional scripts for styling:**

**Sass:**
```json
{
  "scripts": {
    "dev": "concurrently \"sass --watch\" \"stati dev\"",
    "build": "sass src/styles.scss public/styles.css && stati build"
  }
}
```

**Tailwind:**
```json
{
  "scripts": {
    "dev": "concurrently \"tailwindcss --watch\" \"stati dev\"",
    "build": "tailwindcss --minify && stati build"
  }
}

```

## Next Steps

- [Learn about project structure](/getting-started/project-structure/)
- [Configure your site](/configuration/)
- [Add content](/core-concepts/content/)
- [Deploy your site](/deployment/)
```

### Configuration File

Create `.stati-scaffold.json` for defaults:

```json
{
  "defaultTemplate": "blog",
  "defaultStyling": "tailwind",
  "autoGit": true,
  "autoInstall": true,
  "skipPrompts": false,
  "customTemplates": [
    {
      "name": "company-blog",
      "source": "github:company/stati-blog-template"
    }
  ]
}
```

### Programmatic Usage

Use the scaffolder programmatically:

```javascript
import { scaffold } from 'create-stati';

async function createProject() {
  await scaffold({
    projectName: 'my-site',
    template: 'blog',
    styling: 'tailwind',
    git: true,
    install: true,
    directory: './projects/my-site',
  });
}

createProject();
```

## Template Development

### Creating Templates

```bash
# Template development structure
my-template/
├── template.json            # Template metadata
├── template/                # Template files
│   ├── site/
│   ├── public/
│   ├── package.json.ejs    # Dynamic files
│   └── stati.config.js.ejs
├── prompts.js              # Custom prompts
└── hooks.js                # Post-generation hooks
```

**Custom Prompts:**

```javascript
// prompts.js
export default [
  {
    type: 'input',
    name: 'siteName',
    message: 'What is your site name?',
    default: 'My Stati Site',
  },
  {
    type: 'list',
    name: 'theme',
    message: 'Choose a color theme:',
    choices: ['blue', 'green', 'purple', 'red'],
  },
];
```

**Post-Generation Hooks:**

```javascript
// hooks.js
export default {
  async postGenerate(context) {
    const { projectPath, answers } = context;

    // Custom logic after generation
    if (answers.theme === 'blue') {
      // Modify theme files
    }

    // Install additional dependencies
    await installDependencies(projectPath, ['custom-package']);
  },
};
```

### Template Variables

Use EJS templating in files:

```json
// package.json.ejs
{
  "name": "<%= projectName %>",
  "version": "1.0.0",
  "description": "<%= description %>",
  "scripts": {
    "dev": "stati dev",
    "build": "stati build"<% if (styling === 'sass') { %>,
    "build:css": "sass src/styles.scss public/styles.css"<% } %>
  }
}
```

## Best Practices

### Template Design

1. **Sensible Defaults**: Provide good defaults for common use cases
2. **Flexible Structure**: Allow customization without breaking functionality
3. **Documentation**: Include comprehensive README and examples
4. **Performance**: Optimize for fast generation and good runtime performance

### User Experience

1. **Clear Prompts**: Ask clear, specific questions
2. **Helpful Descriptions**: Provide context for choices
3. **Error Handling**: Handle edge cases gracefully
4. **Progress Feedback**: Show progress during generation

### Maintenance

1. **Version Updates**: Keep templates updated with latest Stati features
2. **Testing**: Test templates with different configurations
3. **Community**: Accept feedback and contributions
4. **Documentation**: Maintain up-to-date documentation

The Stati scaffolder makes it easy to start new projects with best practices and modern tooling. Choose the template that fits your needs or create your own for specific use cases.
