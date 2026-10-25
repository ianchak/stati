import { defineConfig } from '@stati/core';
import { createNews } from './helpers/news.js';

// Make it yours: the name, sections and authors below appear across the whole site,
// in the nameplate, the section tabs, bylines, feeds and every page's SEO metadata.
const site = {
  title: 'Stati News',
  description:
    'Independent news built with Stati. Replace this line with what your newsroom covers.',
  // Under the name in the nameplate
  tagline: 'Independent news from your town',
  baseUrl: 'https://example.com',
  defaultLocale: 'en-US',
  // The time zone dates and times are shown in, such as 'Europe/Berlin' or 'America/Chicago'
  timeZone: 'UTC',

  // Sections, in the order of the section tabs and the front page. Each one is a folder of
  // articles in site/news/ named after its key, and gets a page at /news/<key> and an RSS feed.
  sections: [
    { key: 'world', title: 'World', description: 'News from beyond the city limits.' },
    {
      key: 'politics',
      title: 'Politics',
      description: 'Councils, elections and the people who run them.',
    },
    { key: 'business', title: 'Business', description: 'Companies, jobs and the local economy.' },
    {
      key: 'technology',
      title: 'Technology',
      description: 'The tools people build and the ones they use.',
    },
    { key: 'culture', title: 'Culture', description: 'Arts, food, sport and life around town.' },
  ],

  // Everyone who writes for the site. Articles name them by key: `author: your-name`, or a list
  // for a shared byline. Each author gets a page at /authors/<key> listing their articles.
  authors: {
    'your-name': {
      name: 'Your Name',
      role: 'Editor',
      bio: 'Runs the newsroom and edits the front page. Edit this bio in stati.config.js.',
      // email: 'editor@example.com',
      // website: 'https://example.com',
      // Your X/Twitter handle, for twitter:creator in link previews
      // twitter: '@yourname',
    },
    'staff-writer': {
      name: 'Staff Writer',
      role: 'Reporter',
      bio: 'A placeholder reporter. Rename or remove them in stati.config.js.',
    },
    'guest-writer': {
      name: 'Guest Writer',
      role: 'Contributor',
      bio: 'A placeholder contributor, for writers outside the newsroom.',
    },
  },
};

const news = createNews({ site });

export default defineConfig({
  site,
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',

  helpers: news.helpers,

  // Reading time and NewsArticle metadata on every article; news-sitemap.xml after the build
  hooks: news.hooks,

  collections: {
    // One page per section (site/news/[section].md) and per author (site/authors/[author].md)
    generate: news.generate,
    // Front matter the listings show. When one of these changes on an article, Stati rebuilds
    // the front page, section, author and tag pages that list it.
    summaryFields: [
      'title',
      'description',
      'tags',
      'draft',
      'author',
      'image',
      'imageAlt',
      'lead',
      'featured',
      'readingTime',
    ],
  },

  // Builds dist/search-index-<hash>.json, which the search dialog loads on first use
  search: {
    enabled: true,
  },

  seo: {
    autoInject: true,
    // Articles are shared as articles, with their date, section, author and tags
    articles: { include: ['/news/*/*'] },
  },

  rss: {
    enabled: true,
    // feed.xml with every article, plus feed-world.xml and so on, one per section
    feeds: news.feeds(),
  },

  sitemap: {
    enabled: true,
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.5,
    priorityRules: [
      { pattern: '/', priority: 1.0 },
      { pattern: '/news', priority: 0.9 },
      { pattern: '/news/*', priority: 0.8 },
      { pattern: '/news/**', priority: 0.7 },
    ],
  },

  robots: {
    enabled: true,
    userAgents: [{ userAgent: '*', allow: ['/'] }],
    sitemap: true,
    // The Google News sitemap, written by the afterAll hook in helpers/news.js
    customLines: [`Sitemap: ${site.baseUrl.replace(/\/+$/, '')}/news-sitemap.xml`],
  },
});
