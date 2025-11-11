import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'Stati Documentation',
    baseUrl: 'https://stati.build',
    defaultLocale: 'en-US',
  },
  dev: {
    open: true,
  },
  markdown: {
    plugins: [
      [
        'anchor',
        {
          slugify: (s) =>
            s
              .toLowerCase()
              .trim()
              .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with hyphens
              .replace(/^-+|-+$/g, ''), // Remove leading/trailing hyphens
        },
      ],
      'toc-done-right',
      ['external-links', { externalTarget: '_blank' }],
      [
        'prism',
        {
          defaultLanguage: 'javascript',
        },
      ],
    ],
    configure: () => {
      // Add custom markdown configuration here
    },
  },
  eta: {
    filters: {
      // Custom filters for documentation
      formatDate: (date) => new Date(date).toLocaleDateString('en-US'),
      slugify: (text) =>
        text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, ''),
    },
  },
  isg: {
    enabled: true,
    ttlSeconds: 86400, // 24 hours for docs
    maxAgeCapDays: 30, // Docs update frequently
  },
  sitemap: {
    enabled: true,
    defaultPriority: 0.7,
    defaultChangeFreq: 'weekly',
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/getting-started/**', priority: 0.9 },
      { pattern: '/core-concepts/**', priority: 0.9 },
      { pattern: '/api/**', priority: 0.8 },
    ],
  },
  robots: {
    enabled: true,
    sitemap: true,
  },
  rss: {
    enabled: true,
    feeds: [
      {
        filename: 'feed.xml',
        title: 'Stati Documentation Updates',
        description: 'Latest updates to Stati documentation',
        language: 'en-US',
        category: 'Documentation',
        maxItems: 30,
      },
    ],
  },
});
