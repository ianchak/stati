import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: 'Stati Documentation',
    baseUrl: process.env.DEPLOY_URL || 'https://stati.imrecsige.dev',
    defaultLocale: 'en-US',
  },
  markdown: {
    plugins: [
      'anchor',
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
});
