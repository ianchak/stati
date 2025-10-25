# create-stati

**The official scaffolding tool for Stati — get a new static site up and running in under 2 minutes.**

Create a production-ready Stati site with your choice of template and styling, complete with sensible defaults and best practices built-in.

---

## Quick Start

Create a new Stati site with a single command:

```bash
npx create-stati
```

The interactive wizard will guide you through:

1. **Project name** - What to call your site
2. **Template** - Starting point (currently: blank)
3. **CSS solution** - Plain CSS, Sass, or Tailwind
4. **Git initialization** - Optional repository setup

In less than 2 minutes, you'll have a complete static site ready to customize.

---

## Non-Interactive Mode

Skip the prompts and create a site with specific options:

```bash
npx create-stati my-site --template=blank --styling=tailwind --git
```

**Available flags:**

- `--template <name>` - Template to use (currently: `blank`)
- `--styling <type>` - CSS solution (`css` | `sass` | `tailwind`)
- `--git` - Initialize git repository
- `--no-git` - Skip git initialization
- `--help`, `-h` - Show help message

**Examples:**

```bash
# Plain CSS with Git
npx create-stati my-blog --styling=css --git

# Tailwind without Git
npx create-stati my-portfolio --styling=tailwind --no-git

# Sass with all defaults
npx create-stati my-docs --styling=sass
```

---

## Interactive Setup

When you run `npx create-stati`, you'll see a friendly wizard:

```text
? Project name: my-site
? Choose a template: Blank
? Which CSS solution would you like? (Use arrow keys)
  > Plain CSS (recommended for beginners)
    Sass/SCSS
    Tailwind CSS
? Initialize a git repository? (Y/n)
```

Each choice is explained, so you can make the right decision for your project.

---

## The Blank Template

A minimal, flexible starting point for any type of Stati site.

### What You Get

**Features:**

- Clean, minimal layout with no opinionated styling
- Basic page structure with welcome content and clear instructions
- Responsive design foundation ready to customize
- Extensible architecture for any project type
- Just the essentials - build on your own terms

**File Structure:**

```text
my-site/
├── site/
│   ├── index.md          # Homepage with welcome content
│   └── layout.eta        # Main HTML layout template
├── public/
│   ├── styles.css        # Basic CSS styles
│   └── favicon.svg       # Default favicon
├── stati.config.js       # Stati configuration
└── package.json          # Project dependencies
```

**What's Included:**

- **Homepage (`site/index.md`)** - Welcome page with getting started instructions
- **Layout (`site/layout.eta`)** - HTML5 boilerplate with responsive meta tags
- **Styles (`public/styles.css`)** - Minimal CSS with typography and layout helpers
- **Configuration (`stati.config.js`)** - Pre-configured with sensible defaults
- **Favicon (`public/favicon.svg`)** - Simple SVG favicon ready to customize

### Perfect For

- Personal websites and portfolios
- Landing pages and marketing sites
- Learning Stati fundamentals
- Any project where you want full control

### Getting Started with Blank

1. The homepage provides clear next steps
2. Edit `site/index.md` to add your content
3. Customize `site/layout.eta` for your HTML structure
4. Update `public/styles.css` with your styling
5. Configure site metadata in `stati.config.js`

---

## CSS Options

Choose the styling approach that fits your workflow.

### Plain CSS (Recommended for Beginners)

- Simple and straightforward
- No build step required
- Full control over every style
- Great for learning
- Included: Basic CSS with typography and layout helpers

### Sass/SCSS

- CSS with superpowers (variables, nesting, mixins)
- Compiles to standard CSS
- Popular and well-supported
- Included: Sass compiler and build scripts

### Tailwind CSS

- Utility-first framework
- Rapid prototyping
- Built-in design system
- Automatic purging for production
- Included: Tailwind + PostCSS + config files

---

## After Creation

Once your site is created, follow these steps:

### 1. Install Dependencies

```bash
cd my-site
npm install
```

### 2. Start Development

```bash
npm run dev
```

Your site will be live at `http://localhost:3000` with hot reload.

### 3. Build for Production

```bash
npm run build
```

Static files will be generated in the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

Test your production build at `http://localhost:4000`.

---

## Project Structure

All Stati sites follow this conventional structure:

```text
my-site/
├── site/             # Your content and templates
│   ├── *.md          # Markdown pages
│   ├── *.eta         # Eta templates
│   └── _partials/    # Reusable template parts (optional)
├── public/           # Static assets (CSS, images, fonts)
├── stati.config.js   # Stati configuration
├── package.json      # Project metadata and scripts
└── dist/             # Built site (generated on build)
```

**How it works:**

- **`site/`** - All your content lives here. Markdown files become pages.
- **`public/`** - Static assets copied as-is to your build.
- **`stati.config.js`** - Configure your site's behavior.
- **`dist/`** - Your built static site, ready to deploy.

---

## Next Steps

### Learn Stati

- [Documentation](https://docs.stati.build) - Complete guides and tutorials
- [Core Concepts](https://docs.stati.build/core-concepts/overview/) - Templates, routing, and markdown
- [Configuration](https://docs.stati.build/configuration/file/) - Site config, ISG, and hooks
- [Examples](https://docs.stati.build/examples/list/) - Real-world recipes

### Customize Your Site

- Modify layouts and styles to match your brand
- Add new pages in the `site/` directory
- Create reusable partials in `site/_partials/`
- Configure SEO, sitemap, and robots.txt

### Deploy

Build your site and deploy to any static hosting:

- **Netlify** - Drag and drop `dist/` or connect Git
- **Vercel** - Import your repository
- **GitHub Pages** - Push `dist/` to `gh-pages` branch
- **Any static host** - Just upload the `dist/` folder

---

## Configuration Example

Each template comes with a pre-configured `stati.config.js` optimized for that use case:

```javascript
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Stati Site',
    baseUrl: 'https://example.com',
    defaultLocale: 'en-US',
  },
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
});
```

You can customize this file to add features like SEO, sitemap, ISG caching, and more. See the [Configuration Guide](https://docs.stati.build/configuration/file/) for all options.

---

## Requirements

- **Node.js** >=22
- **npm** 11.5.1 or higher (or yarn/pnpm equivalent)

---

## Learn More

- [Full Documentation](https://docs.stati.build) - Complete guides and tutorials
- [CLI Commands](https://docs.stati.build/cli/commands/) - All available commands
- [Core Concepts](https://docs.stati.build/core-concepts/overview/) - How Stati works
- [Examples](https://docs.stati.build/examples/list/) - Real-world projects and recipes

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas
- [Documentation](https://docs.stati.build) - Comprehensive guides

---

## License

MIT © [Imre Csige](https://github.com/ianchak)

