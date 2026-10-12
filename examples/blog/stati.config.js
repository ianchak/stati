import { defineConfig } from '@stati/core';
import { createBlog } from './helpers/blog.js';

// Make it yours: the name, address and author below appear across the whole blog,
// in the header and footer, the RSS feed and every page's SEO metadata.
const site = {
  title: 'Stati Blog',
  description: 'A blog built with Stati. Replace this line with what you write about.',
  baseUrl: 'https://example.com',
  defaultLocale: 'en-US',
  author: {
    name: 'Your Name',
    url: 'https://example.com/about',
    bio: 'Writes about whatever this blog turns out to be about. Edit this bio in stati.config.js.',
  },
  // Links in the header, in order. The RSS link is added automatically.
  nav: [
    { label: 'Archive', url: '/archive' },
    { label: 'Tags', url: '/tags' },
    { label: 'About', url: '/about' },
  ],
  // Number of posts listed on the home page before "All posts" takes over.
  homePostCount: 8,
};

const blog = createBlog({
  site,
  author: site.author,
  postsPath: '/posts/',
  tagsPath: '/tags',
  socialImage: {
    url: '/images/social-card.png',
    alt: `${site.title}, a blog built with Stati`,
    width: 1200,
    height: 630,
  },
});

export default defineConfig({
  site,
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  eta: {
    filters: blog.filters,
  },

  hooks: blog.hooks,

  seo: {
    autoInject: true,
    defaultAuthor: { name: site.author.name, url: site.author.url },
  },

  rss: {
    enabled: true,
    feeds: [
      {
        filename: 'feed.xml',
        title: site.title,
        description: site.description,
        link: site.baseUrl,
        language: site.defaultLocale.toLowerCase(),
        contentPatterns: ['**/posts/**/*.md'],
        maxItems: 20,
        sortBy: 'date-desc',
        itemMapping: {
          category: (page) => page.frontMatter.tags,
        },
      },
    ],
  },

  sitemap: {
    enabled: true,
    defaultChangeFreq: 'monthly',
    defaultPriority: 0.5,
    excludePatterns: ['/404'],
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/posts/**', priority: 0.8 },
    ],
  },

  robots: {
    enabled: true,
    userAgents: [{ userAgent: '*', allow: ['/'] }],
    sitemap: true,
  },
});
