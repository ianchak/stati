import { defineConfig } from '@stati/core';
import Prism from 'prismjs';
// Languages used by the build-time highlighter for code in Eta templates.
// Imported directly: Prism's loadLanguages() relies on require.resolve.
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-markup-templating.js';
import 'prismjs/components/prism-ejs.js';

const DOCS_SECTIONS = [
  { path: '/getting-started', title: 'Getting started' },
  { path: '/core-concepts', title: 'Core concepts' },
  { path: '/configuration', title: 'Configuration' },
  { path: '/cli', title: 'CLI' },
  { path: '/api', title: 'API' },
  { path: '/examples', title: 'Examples' },
  { path: '/advanced', title: 'Advanced' },
];

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
      ['external-links', { externalTarget: '_blank' }],
      // {.class} after a Markdown image, for the light and dark screenshots
      'attrs',
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
      formatDate: (date: unknown) =>
        new Date(date as string | number | Date).toLocaleDateString('en-US'),
      slugify: (text: unknown) =>
        String(text)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, ''),
      // Ordered docs sections shared by the sidebar and the previous/next pager
      docsSections: () => DOCS_SECTIONS,
      // Syntax-highlights code at build time so templates ship no highlighter
      highlight: (code: unknown, lang: unknown) => {
        const source = String(code).replace(/^\n+|\s+$/g, '');
        const grammar = Prism.languages[String(lang)];
        return grammar ? Prism.highlight(source, grammar, String(lang)) : escapeHtml(source);
      },
    },
  },
  typescript: {
    enabled: true,
    srcDir: 'src',
    bundles: [
      {
        entryPoint: 'core.ts',
        bundleName: 'core',
      },
      {
        entryPoint: 'home.ts',
        bundleName: 'home',
        include: ['/'],
      },
      {
        entryPoint: 'docs.ts',
        bundleName: 'docs',
        exclude: ['/'],
      },
    ],
  },
  images: {
    // AVIF and WebP variants of Markdown images (@stati/images)
    responsive: {
      // The docs column (max-w-prose) is about 725px wide from 768px up
      sizes: '(min-width: 768px) 725px, 100vw',
    },
    // A link preview card for every page, drawn from the built-in template
    og: {
      exclude: ['/404'],
    },
  },
  isg: {
    enabled: true,
    ttlSeconds: 86400, // 24 hours for docs
    maxAgeCapDays: 30, // Docs update frequently
  },
  search: {
    enabled: true,
    exclude: ['/404'],
  },
  sitemap: {
    enabled: true,
    defaultPriority: 0.7,
    defaultChangeFreq: 'weekly',
    excludePatterns: ['/404'],
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/getting-started/**', priority: 0.9 },
      { pattern: '/core-concepts/**', priority: 0.9 },
      { pattern: '/api/**', priority: 0.8 },
      { pattern: '/faq', priority: 0.85 },
      { pattern: '/glossary', priority: 0.75 },
      { pattern: '/configuration/**', priority: 0.8 },
      { pattern: '/cli/**', priority: 0.7 },
      { pattern: '/advanced/**', priority: 0.6 },
      { pattern: '/examples/**', priority: 0.7 },
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
        excludePatterns: ['**/404.md'],
      },
    ],
  },
});

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
