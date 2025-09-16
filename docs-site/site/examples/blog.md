---
title: 'Blog Example'
description: 'Complete example of building a blog with Stati, including posts, pagination, RSS feeds, and SEO optimization.'
---

# Blog Example

Learn how to build a complete blog with Stati, featuring post management, tagging, pagination, RSS feeds, and SEO optimization. This example demonstrates best practices for content organization and blog functionality.

## Project Structure

```
my-blog/
├── stati.config.js          # Configuration
├── package.json
├── site/                    # Content and templates
│   ├── index.md            # Homepage
│   ├── about.md            # About page
│   ├── layout.eta          # Main layout
│   ├── _partials/          # Reusable components
│   │   ├── header.eta
│   │   ├── footer.eta
│   │   ├── post-card.eta
│   │   ├── pagination.eta
│   │   ├── tag-list.eta
│   │   └── sidebar.eta
│   └── blog/               # Blog content
│       ├── index.md        # Blog listing page
│       ├── layout.eta      # Blog layout
│       ├── 2024/
│       │   ├── hello-world.md
│       │   ├── getting-started.md
│       │   └── advanced-tips.md
│       └── tags/
│           ├── layout.eta  # Tag page layout
│           └── index.md    # All tags
├── public/                 # Static assets
│   ├── styles.css
│   ├── images/
│   └── favicon.ico
└── dist/                   # Generated site
```

## Configuration

### Basic Configuration

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'My Tech Blog',
    description: 'Thoughts on web development, technology, and programming',
    url: 'https://myblog.com',
    author: {
      name: 'John Doe',
      email: 'john@myblog.com',
      url: 'https://johndoe.com',
      avatar: '/images/avatar.jpg',
    },
    language: 'en',
  },

  build: {
    contentDir: 'site',
    outputDir: 'dist',
    publicDir: 'public',
  },

  markdown: {
    html: true,
    linkify: true,
    typographer: true,
    highlight: {
      enabled: true,
      theme: 'github',
      lineNumbers: true,
    },
  },

  // RSS feed configuration
  feeds: {
    rss: {
      enabled: true,
      path: '/feed.xml',
      title: 'My Tech Blog RSS Feed',
      description: 'Latest posts from my tech blog',
    },
  },

  // Pagination settings
  pagination: {
    pageSize: 10,
    pathPattern: '/blog/page/:page',
  },
});
```

### SEO Configuration

```javascript
export default defineConfig({
  site: {
    // ... other config

    // SEO metadata
    meta: {
      keywords: ['web development', 'javascript', 'react', 'node.js'],
      robots: 'index, follow',
    },

    // Open Graph
    openGraph: {
      type: 'website',
      image: '/images/og-default.jpg',
      siteName: 'My Tech Blog',
    },

    // Twitter cards
    twitter: {
      card: 'summary_large_image',
      site: '@myblog',
      creator: '@johndoe',
    },
  },
});
```

## Content Structure

### Homepage

```markdown
---
title: 'Welcome to My Tech Blog'
description: 'A blog about web development, programming, and technology'
template: 'home'
---

# Welcome to My Tech Blog

Hi, I'm John! I'm a web developer passionate about JavaScript, React, and modern web technologies.

Here you'll find tutorials, tips, and my thoughts on the ever-evolving world of web development.

## Latest Posts

<!-- Latest posts will be injected here by the template -->

## About Me

I've been developing web applications for over 8 years, working with startups and enterprises to build scalable, user-friendly solutions.

[Read more about me →](/about)
```

### Blog Posts

````markdown
---
title: 'Getting Started with React Hooks'
description: 'Learn how to use React Hooks to manage state and side effects in functional components'
publishedAt: '2024-01-15'
author: 'John Doe'
tags: ['react', 'javascript', 'hooks', 'tutorial']
category: 'React'
image: '/images/react-hooks-cover.jpg'
draft: false
---

# Getting Started with React Hooks

React Hooks revolutionized how we write React components by allowing us to use state and other React features in functional components. In this tutorial, we'll explore the most commonly used hooks and learn how to build powerful, reusable components.

## What are React Hooks?

Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have become the standard way to write React components.

### useState Hook

The `useState` hook allows you to add state to functional components:

```javascript
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}
```
````

### useEffect Hook

The `useEffect` hook lets you perform side effects in function components:

```javascript
import React, { useState, useEffect } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []); // Empty dependency array means this runs once

  if (loading) return <div>Loading...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## Best Practices

### 1. Use the Rules of Hooks

- Only call hooks at the top level of your function
- Only call hooks from React function components or custom hooks

### 2. Optimize with useCallback and useMemo

```javascript
import React, { useState, useCallback, useMemo } from 'react';

function ExpensiveComponent({ items }) {
  const [filter, setFilter] = useState('');

  // Memoize expensive calculations
  const filteredItems = useMemo(() => {
    return items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()));
  }, [items, filter]);

  // Memoize callback functions
  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
  }, []);

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={handleFilterChange}
        placeholder="Filter items..."
      />
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Create Custom Hooks

Extract reusable logic into custom hooks:

```javascript
// hooks/useLocalStorage.js
import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
```

Usage:

```javascript
import useLocalStorage from './hooks/useLocalStorage';

function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle theme</button>
    </div>
  );
}
```

## Conclusion

React Hooks provide a powerful and flexible way to manage state and side effects in functional components. By following best practices and creating custom hooks, you can build more maintainable and reusable React applications.

What's your experience with React Hooks? Let me know in the comments below!

---

_Published on January 15, 2024 by John Doe_

````

### About Page

```markdown
---
title: 'About John Doe'
description: 'Learn more about John Doe, a web developer passionate about JavaScript and modern web technologies'
---

# About Me

Hi there! I'm John Doe, a passionate web developer with over 8 years of experience building modern web applications. I love working with JavaScript, React, Node.js, and exploring new technologies.

## My Journey

I started my programming journey in college, where I fell in love with the problem-solving aspect of coding. After graduation, I joined a startup where I learned the importance of building scalable, maintainable applications.

Over the years, I've worked with:

- **Frontend**: React, Vue.js, TypeScript, Next.js, Svelte
- **Backend**: Node.js, Express, GraphQL, PostgreSQL, MongoDB
- **DevOps**: Docker, AWS, CI/CD, Kubernetes
- **Tools**: Git, webpack, Vite, Jest, Cypress

## Current Focus

Currently, I'm exploring:

- **Web Performance**: Optimizing Core Web Vitals and user experience
- **JAMstack**: Building fast, secure static sites
- **Web Components**: Creating reusable components with modern standards
- **AI/ML**: Integrating machine learning into web applications

## Writing

I believe in sharing knowledge with the community. That's why I write about:

- Web development tutorials and best practices
- New JavaScript features and frameworks
- Performance optimization techniques
- Developer productivity and tools

## Let's Connect

I'm always interested in connecting with fellow developers and discussing technology. You can find me on:

- **Twitter**: [@johndoe](https://twitter.com/johndoe)
- **GitHub**: [johndoe](https://github.com/johndoe)
- **LinkedIn**: [johndoe](https://linkedin.com/in/johndoe)
- **Email**: [john@myblog.com](mailto:john@myblog.com)

## Fun Facts

- ☕ I drink way too much coffee
- 🎮 I enjoy playing video games in my spare time
- 📚 I'm always reading tech books and blogs
- 🏃‍♂️ Running helps me clear my mind and solve coding problems
- 🎸 I play guitar (badly) to relax

Thanks for stopping by, and I hope you find my content helpful!
````

## Templates

### Main Layout

```html
<!-- site/layout.eta -->
<!DOCTYPE html>
<html lang="<%= site.language || 'en' %>">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>
      <%= page.title %><% if (page.title !== site.title) { %> | <%= site.title %><% } %>
    </title>
    <meta name="title" content="<%= page.title %>" />
    <meta name="description" content="<%= page.description || site.description %>" />
    <meta name="author" content="<%= page.author || site.author.name %>" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="<%= page.type === 'post' ? 'article' : 'website' %>" />
    <meta property="og:url" content="<%= site.url %><%= page.path %>" />
    <meta property="og:title" content="<%= page.title %>" />
    <meta property="og:description" content="<%= page.description || site.description %>" />
    <meta property="og:image" content="<%= site.url %><%= page.image || site.openGraph.image %>" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="<%= site.url %><%= page.path %>" />
    <meta property="twitter:title" content="<%= page.title %>" />
    <meta property="twitter:description" content="<%= page.description || site.description %>" />
    <meta
      property="twitter:image"
      content="<%= site.url %><%= page.image || site.openGraph.image %>"
    />

    <!-- Styles -->
    <link rel="stylesheet" href="/styles.css" />
    <link rel="icon" href="/favicon.ico" />

    <!-- RSS Feed -->
    <link rel="alternate" type="application/rss+xml" title="<%= site.title %>" href="/feed.xml" />
  </head>
  <body>
    <%~ include('_partials/header') %>

    <main class="main-content"><%~ content %></main>

    <%~ include('_partials/footer') %>

    <!-- Analytics -->
    <% if (site.analytics && site.analytics.googleAnalytics) { %>
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=<%= site.analytics.googleAnalytics %>"
    ></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', '<%= site.analytics.googleAnalytics %>');
    </script>
    <% } %>
  </body>
</html>
```

### Header Partial

```html
<!-- site/_partials/header.eta -->
<header class="header">
  <nav class="nav container">
    <div class="nav-brand">
      <a href="/" class="nav-logo"> <%= site.title %> </a>
    </div>

    <ul class="nav-menu">
      <li class="nav-item">
        <a href="/" class="nav-link <%= page.path === '/' ? 'active' : '' %>"> Home </a>
      </li>
      <li class="nav-item">
        <a href="/blog/" class="nav-link <%= page.path.startsWith('/blog') ? 'active' : '' %>">
          Blog
        </a>
      </li>
      <li class="nav-item">
        <a href="/about/" class="nav-link <%= page.path === '/about/' ? 'active' : '' %>">
          About
        </a>
      </li>
    </ul>

    <div class="nav-search">
      <input type="search" placeholder="Search posts..." class="search-input" />
    </div>
  </nav>
</header>
```

### Blog Layout

```html
<!-- site/blog/layout.eta -->
<%~ includeFile('../layout.eta', { ...it, content: `
<div class="blog-container container">
  <div class="blog-main">${content}</div>
  <aside class="blog-sidebar">${include('_partials/sidebar')}</aside>
</div>
` }) %>
```

### Post Card Partial

```html
<!-- site/_partials/post-card.eta -->
<article class="post-card">
  <% if (post.image) { %>
  <div class="post-card-image">
    <img src="<%= post.image %>" alt="<%= post.title %>" loading="lazy" />
  </div>
  <% } %>

  <div class="post-card-content">
    <header class="post-card-header">
      <h3 class="post-card-title">
        <a href="<%= post.path %>"><%= post.title %></a>
      </h3>

      <div class="post-card-meta">
        <time datetime="<%= post.publishedAt %>">
          <%= new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month:
          'long', day: 'numeric' }) %>
        </time>

        <% if (post.author) { %>
        <span class="post-author">by <%= post.author %></span>
        <% } %> <% if (post.readingTime) { %>
        <span class="reading-time"><%= post.readingTime %> min read</span>
        <% } %>
      </div>
    </header>

    <p class="post-card-excerpt">
      <%= post.description || post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' %>
    </p>

    <% if (post.tags && post.tags.length > 0) { %>
    <div class="post-card-tags">
      <% post.tags.forEach(tag => { %>
      <a href="/blog/tags/<%= tag.toLowerCase() %>/" class="tag"> #<%= tag %> </a>
      <% }) %>
    </div>
    <% } %>
  </div>
</article>
```

### Pagination Partial

```html
<!-- site/_partials/pagination.eta -->
<% if (pagination && (pagination.prev || pagination.next)) { %>
<nav class="pagination" role="navigation" aria-label="Pagination">
  <% if (pagination.prev) { %>
  <a href="<%= pagination.prev %>" class="pagination-prev"> ← Previous </a>
  <% } %>

  <div class="pagination-numbers">
    <% for (let i = 1; i <= pagination.totalPages; i++) { %> <% if (i === pagination.currentPage) {
    %>
    <span class="pagination-number current" aria-current="page"><%= i %></span>
    <% } else if (i === 1 || i === pagination.totalPages || Math.abs(i - pagination.currentPage) <=
    2) { %>
    <a href="<%= i === 1 ? '/blog/' : `/blog/page/${i}/` %>" class="pagination-number">
      <%= i %>
    </a>
    <% } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) { %>
    <span class="pagination-ellipsis">…</span>
    <% } %> <% } %>
  </div>

  <% if (pagination.next) { %>
  <a href="<%= pagination.next %>" class="pagination-next"> Next → </a>
  <% } %>
</nav>
<% } %>
```

### Sidebar Partial

```html
<!-- site/_partials/sidebar.eta -->
<div class="sidebar">
  <!-- About Section -->
  <div class="sidebar-section">
    <h3>About</h3>
    <div class="author-card">
      <img src="<%= site.author.avatar %>" alt="<%= site.author.name %>" class="author-avatar" />
      <h4><%= site.author.name %></h4>
      <p><%= site.author.bio || 'Web developer and technology enthusiast' %></p>
    </div>
  </div>

  <!-- Recent Posts -->
  <div class="sidebar-section">
    <h3>Recent Posts</h3>
    <ul class="recent-posts">
      <% const recentPosts = pages .filter(p => p.type === 'post' && !p.draft) .sort((a, b) => new
      Date(b.publishedAt) - new Date(a.publishedAt)) .slice(0, 5); %> <% recentPosts.forEach(post =>
      { %>
      <li class="recent-post">
        <a href="<%= post.path %>">
          <h4><%= post.title %></h4>
          <time><%= new Date(post.publishedAt).toLocaleDateString() %></time>
        </a>
      </li>
      <% }) %>
    </ul>
  </div>

  <!-- Popular Tags -->
  <div class="sidebar-section">
    <h3>Popular Tags</h3>
    <div class="tag-cloud">
      <% const tagCounts = {}; pages.forEach(page => { if (page.tags) { page.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1; }); } }); const popularTags =
      Object.entries(tagCounts) .sort(([,a], [,b]) => b - a) .slice(0, 10); %> <%
      popularTags.forEach(([tag, count]) => { %>
      <a
        href="/blog/tags/<%= tag.toLowerCase() %>/"
        class="tag-cloud-item"
        style="font-size: <%= Math.min(1.5, 0.8 + (count / 10)) %>rem"
      >
        <%= tag %> (<%= count %>)
      </a>
      <% }) %>
    </div>
  </div>

  <!-- Newsletter -->
  <div class="sidebar-section">
    <h3>Newsletter</h3>
    <p>Get the latest posts delivered to your inbox.</p>
    <form class="newsletter-form" action="/subscribe" method="post">
      <input type="email" placeholder="Your email" required />
      <button type="submit">Subscribe</button>
    </form>
  </div>
</div>
```

## Advanced Features

### Automatic Tag Pages

Create dynamic tag pages using Stati's collection features:

```javascript
// stati.config.js
export default defineConfig({
  collections: {
    // Generate tag pages
    tags: {
      pattern: 'blog/**/*.md',
      groupBy: 'tags',
      template: 'blog/tag',
      path: '/blog/tags/:key/',

      // Generate tag index
      index: {
        path: '/blog/tags/',
        template: 'blog/tags-index',
      },
    },
  },
});
```

### RSS Feed Generation

```javascript
// plugins/rss-plugin.js
export default function rssPlugin(options = {}) {
  return {
    name: 'rss-generator',

    hooks: {
      'build:end': async (context) => {
        const posts = context.pages
          .filter((page) => page.type === 'post' && !page.draft)
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          .slice(0, 20); // Latest 20 posts

        const rssContent = generateRSSFeed(posts, context.config);

        await fs.writeFile(path.join(context.outputDir, 'feed.xml'), rssContent);
      },
    },
  };
}

function generateRSSFeed(posts, config) {
  const { site } = config;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${site.title}</title>
    <description>${site.description}</description>
    <link>${site.url}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>

    ${posts
      .map(
        (post) => `
    <item>
      <title>${post.title}</title>
      <description><![CDATA[${post.content}]]></description>
      <link>${site.url}${post.path}</link>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <guid>${site.url}${post.path}</guid>
    </item>
    `,
      )
      .join('')}
  </channel>
</rss>`;
}
```

### SEO Optimization

```javascript
// plugins/seo-plugin.js
export default function seoPlugin() {
  return {
    name: 'seo-optimizer',

    hooks: {
      'page:process': async (page, context) => {
        // Generate meta description from content if not provided
        if (!page.description && page.content) {
          const textContent = page.content.replace(/<[^>]*>/g, '');
          page.description = textContent.substring(0, 160) + '...';
        }

        // Add reading time
        if (page.content) {
          const words = page.content.split(/\s+/).length;
          page.readingTime = Math.ceil(words / 200);
        }

        // Generate keywords from tags
        if (page.tags && !page.keywords) {
          page.keywords = page.tags.join(', ');
        }

        return page;
      },
    },
  };
}
```

This blog example demonstrates how to build a comprehensive blog with Stati, including advanced features like RSS feeds, SEO optimization, and dynamic content generation. The structure is scalable and can be extended with additional features as needed.
