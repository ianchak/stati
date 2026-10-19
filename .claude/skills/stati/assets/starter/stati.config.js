import { defineConfig } from '@stati/core';

export default defineConfig({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: {
    title: 'Stati starter',
    baseUrl: 'https://example.com',
    description: 'A small Markdown and Eta website.',
    defaultLocale: 'en',
  },
  helpers: {
    uppercase: (value) => String(value).toUpperCase(),
  },
  typescript: {
    enabled: true,
    bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
  },
  search: { enabled: true, includeHomePage: true },
  sitemap: { enabled: true },
  robots: { enabled: true, sitemap: true },
  rss: {
    enabled: true,
    feeds: [
      {
        filename: 'rss.xml',
        title: 'Stati starter articles',
        description: 'Latest articles.',
        contentPatterns: ['**/blog/**/*.md'],
        filter: (page) => page.url !== '/blog',
        maxItems: 20,
      },
    ],
  },
});
