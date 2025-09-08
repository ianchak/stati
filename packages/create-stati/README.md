# create-stati

The official scaffolding tool for Stati, a lightweight TypeScript static site generator.

## Usage

Create a new Stati site with a single command:

```bash
npm create stati my-site
```

Or using other package managers:

```bash
# Using Yarn
yarn create stati my-site

# Using PNPM
pnpm create stati my-site

# Using Bun
bun create stati my-site
```

## Interactive Setup

The tool will prompt you to configure your new site:

```
? Project name: my-site
? Template: (Use arrow keys)
❯ blog
  docs
  news
? Add Tailwind CSS? (y/N)
```

## Templates

### Blog Template

Perfect for personal blogs, company blogs, or content-focused sites.

**Features:**

- Article listing with pagination
- Individual post pages
- Categories and tags
- RSS feed generation
- SEO-optimized structure

**Structure:**

```
my-blog/
├── site/
│   ├── index.md          # Homepage
│   ├── layout.eta        # Main layout
│   ├── blog/
│   │   ├── index.md      # Blog listing
│   │   └── posts/        # Individual posts
│   └── _partials/
│       ├── header.eta
│       └── footer.eta
├── public/
│   └── styles.css
└── stati.config.js
```

### Docs Template

Ideal for documentation sites, API references, or knowledge bases.

**Features:**

- Sidebar navigation
- Search functionality
- Version management
- Code highlighting
- Table of contents

**Structure:**

```
my-docs/
├── site/
│   ├── index.md          # Documentation home
│   ├── layout.eta        # Documentation layout
│   ├── guide/            # User guides
│   ├── reference/        # API reference
│   └── _partials/
│       ├── sidebar.eta
│       └── toc.eta
├── public/
│   └── docs.css
└── stati.config.js
```

### News Template

Great for news sites, press releases, or announcement pages.

**Features:**

- Chronological listing
- Category filtering
- Breaking news highlights
- Archive pages
- Social sharing

**Structure:**

```
my-news/
├── site/
│   ├── index.md          # Latest news
│   ├── layout.eta        # News layout
│   ├── articles/         # News articles
│   ├── categories/       # Category pages
│   └── _partials/
│       ├── headline.eta
│       └── sidebar.eta
├── public/
│   └── news.css
└── stati.config.js
```

## Customization Options

### Tailwind CSS

When you choose to include Tailwind CSS, the scaffolder will:

- Install Tailwind CSS and its dependencies
- Create a `tailwind.config.js` file
- Set up PostCSS configuration
- Include Tailwind directives in your CSS
- Configure purging for production builds

### Configuration

Each template comes with a pre-configured `stati.config.js` file optimized for that template type:

```javascript
// Example blog configuration
export default {
  site: './site',
  output: './dist',
  public: './public',
  meta: {
    title: 'My Blog',
    description: 'A blog built with Stati',
    url: 'https://my-blog.com',
  },
  markdown: {
    plugins: ['anchor', 'toc-done-right'],
  },
};
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

## Project Structure

All templates follow Stati's conventional structure:

```
my-site/
├── site/              # Your content and templates
│   ├── *.md          # Markdown pages
│   ├── *.eta         # Eta templates
│   └── _partials/    # Reusable template parts
├── public/           # Static assets (CSS, images, etc.)
├── stati.config.js   # Stati configuration
├── package.json      # Project metadata and scripts
└── dist/            # Built site (generated)
```

## Next Steps

- **Learn Stati:** Check out the [Stati documentation](https://github.com/ianchak/stati)
- **Customize templates:** Modify layouts and styles to match your brand
- **Add content:** Create new pages and posts in the `site/` directory
- **Deploy:** Build your site and deploy to any static hosting provider

## Requirements

- Node.js 18+
- npm, yarn, pnpm, or bun

## License

MIT
