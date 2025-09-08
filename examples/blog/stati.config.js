import { defineConfig } from '@stati/core';

export default defineConfig({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: {
    title: 'My Personal Blog',
    baseUrl: 'https://myblog.example.com',
    defaultLocale: 'en-US',
  },
  markdown: {
    plugins: [
      'anchor',
      'table-of-contents',
      ['attrs', { leftDelimiter: '{:', rightDelimiter: '}' }],
    ],
  },
  eta: {
    filters: {
      // Custom filter to format dates
      formatDate: (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      // Custom filter to create excerpts
      excerpt: (content, length = 150) => {
        if (!content) return '';
        const text = content.replace(/<[^>]*>/g, '').trim();
        return text.length > length ? text.substring(0, length) + '...' : text;
      },
    },
  },
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`🚀 Building blog with ${ctx.pages.length} pages...`);
    },
    afterAll: async (ctx) => {
      console.log(`✅ Blog build complete! Generated ${ctx.pages.length} pages.`);
    },
  },
});
