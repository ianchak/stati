# create-stati

The official scaffolding tool for Stati, a lightweight TypeScript static site generator.

## Usage

Create a new Stati site with a single command:

```bash
npx create-stati
```

## CLI Options

You can also create a site non-interactively using command-line flags:

```bash
# Create with specific options
npx create-stati my-site --template=blank --styling=tailwind --git

# Available options:
#   --template <name>     Template to use (currently: blank)
#   --styling <type>      CSS solution (css|sass|tailwind)
#   --git                 Initialize git repository
#   --no-git              Skip git initialization
#   --help, -h            Show help message
```

## Interactive Setup

The tool will prompt you to configure your new site:

```
? Project name: my-site
? Choose a template: Blank
? Which CSS solution would you like? (Use arrow keys)
❯ Plain CSS (recommended for beginners)
  Sass/SCSS
  Tailwind CSS
? Initialize a git repository? (Y/n)
```

## Templates

### Blank Template

A minimal starting point for any type of Stati site. Perfect for custom projects where you want full control over the structure and styling.

**Features:**

- Clean, minimal layout
- Basic page structure with welcome content
- Responsive design foundation
- Extensible architecture
- No opinionated styling - just the essentials

**Structure:**

```
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

**What's included:**

- **Homepage (`site/index.md`)**: Welcome page with basic content and getting started instructions
- **Layout (`site/layout.eta`)**: HTML5 boilerplate with responsive meta tags and basic navigation structure
- **Styles (`public/styles.css`)**: Minimal CSS with typography basics and responsive layout helpers
- **Configuration (`stati.config.js`)**: Pre-configured with sensible defaults for title, base URL, and directory structure
- **Favicon (`public/favicon.svg`)**: Simple SVG favicon ready to customize

**Perfect for:**

- Personal websites and portfolios
- Landing pages and marketing sites
- Learning Stati fundamentals
- Starting point for any type of site

**Getting started with the blank template:**

1. The homepage provides clear instructions on where to find key files
2. Modify `site/index.md` to add your content
3. Customize `site/layout.eta` for your HTML structure
4. Update `public/styles.css` with your styling
5. Configure site metadata in `stati.config.js`

## Customization Options

### Tailwind CSS

When you choose to include Tailwind CSS, the scaffolder will:

- Add Tailwind CSS and its dependencies to package.json
- Create a `tailwind.config.js` file
- Set up PostCSS configuration
- Include Tailwind directives in your CSS
- Configure purging for production builds

### Configuration

Each template comes with a pre-configured `stati.config.js` file optimized for that template type:

```javascript
// Example blank template configuration
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

## Getting Started

After creating your site:

1. **Navigate to your project:**

   ```bash
   cd my-site
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Build for production:**

   ```bash
   npm run build
   ```

5. **Preview production build:**

   ```bash
   npm run preview
   ```

## Project Structure

All templates follow Stati's conventional structure:

```
my-site/
├── site/             # Your content and templates
│   ├── *.md          # Markdown pages
│   ├── *.eta         # Eta templates
│   └── _partials/    # Reusable template parts
├── public/           # Static assets (CSS, images, etc.)
├── stati.config.js   # Stati configuration
├── package.json      # Project metadata and scripts
└── dist/             # Built site (generated)
```

## Next Steps

- **Learn Stati:** Check out the [Stati documentation](https://docs.stati.build) for comprehensive guides and tutorials
- **Core Concepts:** Understand [templates](https://docs.stati.build/core-concepts/templates), [routing](https://docs.stati.build/core-concepts/routing), and [markdown](https://docs.stati.build/core-concepts/markdown)
- **Configuration:** Learn about [site configuration](https://docs.stati.build/configuration), [ISG](https://docs.stati.build/configuration/isg), and [build hooks](https://docs.stati.build/api/hooks)
- **Examples:** Explore [recipes and examples](https://docs.stati.build/examples) for common use cases
- **Customize templates:** Modify layouts and styles to match your brand
- **Add content:** Create new pages and posts in the `site/` directory
- **Deploy:** Build your site and deploy to any static hosting provider

## Requirements

- Node.js 22.0.0 or higher
- npm 8.0.0 or higher (or yarn/pnpm equivalent)

## License

MIT © [Imre Csige](https://github.com/ianchak)
