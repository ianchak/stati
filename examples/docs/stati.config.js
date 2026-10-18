import { defineConfig } from '@stati/core';
import { createDocs } from './helpers/docs.js';

// Make it yours: the name, address and links below appear on every page,
// in the header, the footer, search results and each page's SEO metadata.
const site = {
  title: 'Stati Docs',
  description: 'Documentation built with Stati. Replace this line with what your project does.',
  baseUrl: 'https://example.com',
  defaultLocale: 'en-US',
  // Links in the header, in order. Leave the array empty for none.
  // `match` lists the sections a link stands for, so it is highlighted on
  // any page in them; without it, a link is highlighted on its own section.
  nav: [
    {
      label: 'Guide',
      url: '/getting-started/introduction',
      match: ['/getting-started', '/writing', '/publishing'],
    },
    { label: 'Customizing', url: '/customizing' },
  ],
  // Your source repository. Shown as an icon in the header; set to '' to hide it.
  repository: 'https://github.com/your-name/your-project',
  // Shown in the footer under the copyright line.
  footer: 'Released under the MIT License.',
};

const docs = createDocs({ site });

export default defineConfig({
  site,
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  markdown: {
    // Syntax highlighting at build time, so pages ship no highlighter.
    // Unknown languages fall back to plain text instead of failing the build.
    plugins: [['prism', { defaultLanguageForUnknown: 'plain' }]],
  },

  helpers: docs.helpers,

  hooks: docs.hooks,

  // Builds dist/search-index-<hash>.json, which the search dialog finds via an
  // injected meta tag and loads on first use.
  search: {
    enabled: true,
    exclude: ['/404'],
  },

  seo: {
    autoInject: true,
  },

  sitemap: {
    enabled: true,
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.7,
    excludePatterns: ['/404'],
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/getting-started/**', priority: 0.9 },
    ],
  },

  robots: {
    enabled: true,
    userAgents: [{ userAgent: '*', allow: ['/'] }],
    sitemap: true,
  },
});
