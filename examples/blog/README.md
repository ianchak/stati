"# Stati Blog Example

A complete example blog built with Stati static site generator, showcasing all the key features and best practices for building modern static websites.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation & Setup

1. **Clone or download** this example to your local machine
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start development server**:
   ```bash
   npm run dev
   ```
4. **Open your browser** to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built site will be in the `dist/` directory, ready for deployment.

## 📁 Project Structure

```
├── stati.config.js          # Stati configuration
├── package.json
├── site/                    # Source content
│   ├── layout.eta           # Main layout template
│   ├── _partials/
│   │   ├── header.eta       # Header component
│   │   └── footer.eta       # Footer component
│   ├── blog/
│   │   ├── index.md         # Blog index page
│   │   └── *.md             # Blog posts
│   ├── index.md             # Homepage
│   ├── about.md             # About page
│   └── contact.md           # Contact page
├── public/                  # Static assets
│   ├── styles.css           # Main stylesheet
│   ├── enhanced.css         # Additional styling features
│   └── favicon.svg          # Site icon
└── dist/                    # Generated site (after build)
```

## ✨ Features Demonstrated

### Content Management

- **Markdown content** with YAML frontmatter
- **Blog posts** with tags, dates, and authors
- **Static pages** (About, Contact)
- **Collection handling** for blog post listings
- **Navigation generation** based on content structure

### Templating

- **Eta template engine** with layout inheritance
- **Partial templates** for reusable components
- **Context passing** with site and page data
- **Collection data** for listing pages
- **Custom template filters** for date formatting

### Styling & Design

- **Responsive CSS** with mobile-first approach
- **Modern design** with clean typography
- **CSS Grid** for layout
- **Flexbox** for components
- **Mobile navigation** with hamburger menu

### SEO & Performance

- **Meta tags** and Open Graph data
- **Semantic HTML** structure
- **Fast loading** static assets
- **Clean URLs** and proper navigation
- **RSS feed** support (configurable)

## 🎨 Customization

### Styling

The main stylesheet is in `public/styles.css`. It uses:

- CSS custom properties (variables)
- Mobile-first responsive design
- Modern CSS features (Grid, Flexbox)
- Print-friendly styles

### Content

- **Add new posts**: Create `.md` files in `site/blog/`
- **Add new pages**: Create `.md` files in `site/`
- **Modify navigation**: Edit the header partial in `site/_partials/header.eta`

### Configuration

Edit `stati.config.js` to customize:

- Site metadata (title, description, URL)
- Markdown plugins and processing
- Template filters and functions
- Build hooks and plugins

## 📝 Writing Content

### Blog Posts

Create new blog posts in `site/blog/` with this frontmatter structure:

```markdown
---
layout: post
title: 'Your Post Title'
description: 'A brief description for SEO'
author: 'Your Name'
publishedAt: 2024-01-15
tags: [web-development, javascript, tutorial]
excerpt: 'A brief excerpt that appears in listings...'
---

Your content here...
```

### Pages

Create static pages in `site/` with this frontmatter:

```markdown
---
layout: page
title: 'Page Title'
description: 'Page description for SEO'
---

Your content here...
```

## 🚀 Deployment

This static site can be deployed to any hosting platform:

### Netlify

1. Connect your Git repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`

### Vercel

1. Import your Git repository
2. Vercel will auto-detect the build settings
3. Deploy!

### GitHub Pages

1. Build locally: `npm run build`
2. Deploy the `dist` folder to `gh-pages` branch

### Traditional Hosting

1. Build the site: `npm run build`
2. Upload the `dist` folder contents to your web server

## 🛠 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview the built site locally
- `npm run clean` - Clean build artifacts and cache

## 📚 Learn More

- [Stati Documentation](https://github.com/ianchak/stati)
- [Eta Template Engine](https://eta.js.org/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Modern CSS](https://moderncss.dev/)

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue in the [Stati repository](https://github.com/ianchak/stati/issues).

## 📄 License

This example is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy blogging with Stati!** 🎉"
