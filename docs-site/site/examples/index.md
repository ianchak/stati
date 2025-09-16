---
title: 'Examples Overview'
description: 'Explore practical examples and recipes for building different types of sites with Stati.'
---

# Examples Overview

Stati is flexible enough to build many different types of websites. This section provides practical examples, complete with source code and step-by-step guides, to help you understand how to implement common patterns and features.

## Featured Examples

### 📝 Blog Site

A complete blog with posts, categories, RSS feed, and search functionality.

**Features:**

- Date-based post organization
- Category and tag filtering
- RSS feed generation
- Search functionality
- Comment system integration
- SEO optimization

**Technologies:** Markdown, ISG, Tailwind CSS, RSS generation
**[View Example →](/examples/blog/)**

### 📚 Documentation Site

A comprehensive documentation site with navigation, search, and cross-references.

**Features:**

- Hierarchical content organization
- Auto-generated navigation
- Table of contents
- Cross-references and linking
- Code syntax highlighting
- Version management

**Technologies:** Nested layouts, partials, content organization
**[View Example →](/examples/docs/)**

### 🍳 Recipe Collection

A collection of practical code recipes and implementation patterns.

**Features:**

- Searchable recipe database
- Difficulty ratings
- Technology tags
- Step-by-step guides
- Code snippets
- Live demos

**Technologies:** Custom front matter, filtering, dynamic content
**[View Example →](/examples/recipes/)**

## Example Categories

### Content-Focused Sites

**Personal Blog**

- Simple layout with post archives
- About page and contact form
- Social media integration
- Newsletter signup

**News Website**

- Breaking news section
- Category-based organization
- Author profiles
- Comment system

**Portfolio Site**

- Project showcases
- Case studies
- Skills and experience
- Contact information

### Documentation Sites

**API Documentation**

- Endpoint reference
- Code examples
- Authentication guides
- SDKs and libraries

**Product Documentation**

- Getting started guides
- Feature tutorials
- Troubleshooting
- FAQ sections

**Technical Wiki**

- Knowledge base
- Cross-referenced articles
- Search functionality
- Contribution workflow

### Business Sites

**Landing Page**

- Hero section
- Feature highlights
- Testimonials
- Call-to-action

**Company Website**

- About us
- Services/Products
- Team members
- Contact information

**Event Site**

- Event information
- Schedule/Agenda
- Speaker profiles
- Registration

## Quick Start Templates

Each example comes with a complete starter template:

```bash
# Create from blog template
npx create-stati my-blog --template blog

# Create from docs template
npx create-stati my-docs --template docs

# Create from landing page template
npx create-stati my-site --template landing
```

## Implementation Patterns

### Content Organization

**Date-based Structure (Blog)**

```
site/
├── blog/
│   ├── index.md              # Blog homepage
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── post-1.md
│   │   │   └── post-2.md
│   │   └── 02/
│   │       └── post-3.md
│   └── categories/
│       ├── tech.md
│       └── design.md
```

**Hierarchical Structure (Docs)**

```
site/
├── docs/
│   ├── index.md              # Docs homepage
│   ├── getting-started/
│   │   ├── index.md
│   │   ├── installation.md
│   │   └── quick-start.md
│   └── api/
│       ├── index.md
│       ├── authentication.md
│       └── endpoints/
```

**Topic-based Structure (Recipes)**

```
site/
├── recipes/
│   ├── index.md              # Recipe index
│   ├── frontend/
│   │   ├── react-patterns.md
│   │   └── css-tricks.md
│   ├── backend/
│   │   ├── api-design.md
│   │   └── database-tips.md
│   └── deployment/
│       └── ci-cd-setup.md
```

### Layout Patterns

**Blog Layout Hierarchy**

```
site/
├── layout.eta               # Base layout
└── blog/
    ├── layout.eta           # Blog section layout
    ├── index.md             # Uses blog layout
    └── posts/
        ├── layout.eta       # Post-specific layout
        └── my-post.md       # Uses post layout
```

**Shared Components**

```
site/
├── _partials/
│   ├── header.eta           # Site header
│   ├── footer.eta           # Site footer
│   ├── navigation.eta       # Main navigation
│   └── post-preview.eta     # Blog post preview
└── blog/
    └── _partials/
        ├── sidebar.eta      # Blog sidebar
        ├── tags.eta         # Tag list
        └── archive.eta      # Archive widget
```

## Common Features

### Search Implementation

**Simple Text Search**

```javascript
// Generate search index during build
export default defineConfig({
  hooks: {
    afterBuild(pages) {
      const searchIndex = pages.map((page) => ({
        title: page.title,
        url: page.url,
        content: stripHtml(page.content).slice(0, 300),
      }));

      fs.writeFileSync('dist/search-index.json', JSON.stringify(searchIndex));
    },
  },
});
```

**Client-side Search**

```javascript
// Frontend search implementation
class SimpleSearch {
  constructor() {
    this.index = null;
    this.loadIndex();
  }

  async loadIndex() {
    const response = await fetch('/search-index.json');
    this.index = await response.json();
  }

  search(query) {
    if (!this.index) return [];

    const results = this.index.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.content.toLowerCase().includes(query.toLowerCase()),
    );

    return results.slice(0, 10);
  }
}
```

### RSS Feed Generation

```javascript
// RSS feed generation
import RSS from 'rss';

export default defineConfig({
  hooks: {
    afterBuild(pages) {
      const blogPosts = pages
        .filter((page) => page.url.startsWith('/blog/'))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);

      const feed = new RSS({
        title: 'My Blog',
        description: 'Latest blog posts',
        feed_url: `${siteUrl}/rss.xml`,
        site_url: siteUrl,
        language: 'en',
      });

      blogPosts.forEach((post) => {
        feed.item({
          title: post.title,
          description: post.description,
          url: siteUrl + post.url,
          date: new Date(post.date),
        });
      });

      fs.writeFileSync('dist/rss.xml', feed.xml());
    },
  },
});
```

### Sitemap Generation

```javascript
// Automatic sitemap generation
export default defineConfig({
  hooks: {
    afterBuild(pages) {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${siteUrl}${page.url}</loc>
    <lastmod>${new Date(page.lastModified || page.date).toISOString()}</lastmod>
    <changefreq>${getChangeFreq(page)}</changefreq>
    <priority>${getPriority(page)}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

      fs.writeFileSync('dist/sitemap.xml', sitemap);
    },
  },
});
```

## Styling Approaches

### Tailwind CSS Setup

```javascript
// tailwind.config.js for blog
export default {
  content: ['./site/**/*.{md,eta}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            '[class~="lead"]': { color: '#4b5563' },
            strong: { color: '#111827' },
            'ul > li::before': { backgroundColor: '#d1d5db' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
```

### CSS-in-JS Alternative

```css
/* Component-based CSS */
.blog-post {
  max-width: 65ch;
  margin: 0 auto;
  line-height: 1.7;
}

.blog-post h1,
.blog-post h2,
.blog-post h3 {
  margin-top: 2em;
  margin-bottom: 0.5em;
  line-height: 1.2;
}

.blog-post pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
}
```

## Performance Optimizations

### Image Optimization

```javascript
// Responsive image helper
export default defineConfig({
  templates: {
    eta: {
      helpers: {
        responsiveImage(src, alt, sizes = '100vw') {
          const basePath = src.replace(/\.[^.]+$/, '');
          const ext = src.split('.').pop();

          return `
            <img
              src="${src}"
              srcset="
                ${basePath}-400.${ext} 400w,
                ${basePath}-800.${ext} 800w,
                ${basePath}-1200.${ext} 1200w
              "
              sizes="${sizes}"
              alt="${alt}"
              loading="lazy"
            />
          `;
        },
      },
    },
  },
});
```

### Code Splitting

```javascript
// Lazy loading for interactive components
document.addEventListener('DOMContentLoaded', () => {
  // Load comment system only when needed
  const commentSection = document.querySelector('[data-comments]');
  if (commentSection) {
    const observer = new IntersectionObserver(async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const { CommentsWidget } = await import('./components/comments.js');
          new CommentsWidget(entry.target);
          observer.unobserve(entry.target);
        }
      }
    });

    observer.observe(commentSection);
  }
});
```

## Development Tips

### Content Authoring

**Front Matter Standards**

```yaml
---
title: 'Post Title'
description: 'SEO description'
date: '2024-01-15'
lastModified: '2024-01-20'
tags: ['javascript', 'tutorial']
category: 'development'
author: 'John Doe'
draft: false
featured: true
image: '/images/post-hero.jpg'
---
```

**Content Templates**

```bash
# Create content templates
mkdir -p .templates

# Blog post template
cat > .templates/blog-post.md << 'EOF'
---
title: 'New Post Title'
description: 'Brief description for SEO'
date: '$(date -I)'
tags: []
category: 'general'
author: 'Your Name'
draft: true
---

# New Post Title

Brief introduction to the post...

## Main Section

Content goes here...

## Conclusion

Wrap up the post...
EOF
```

### Deployment Automation

```yaml
# .github/workflows/deploy.yml
name: Deploy Site
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: stati build
        env:
          SITE_URL: ${{ vars.SITE_URL }}

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './dist'
          production-branch: main
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Getting Started

1. **Choose an example** that matches your use case
2. **Clone or download** the example code
3. **Customize** the content and styling
4. **Deploy** using your preferred hosting service

Each example includes:

- Complete source code
- Step-by-step setup guide
- Customization instructions
- Deployment recommendations
- Performance optimizations

Ready to dive in? Start with the [Blog Example](/examples/blog/) for a complete walkthrough, or explore the [Documentation Example](/examples/docs/) to see how this very site is built!

For quick implementations of specific features, check out our [Recipe Collection](/examples/recipes/) with bite-sized solutions to common challenges.
