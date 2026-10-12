---
title: 'Stati: lightweight static sites, everything built in'
description: 'Stati is a TypeScript-first static site generator: Markdown and Eta templates in, fast static HTML out, with typed config, client TypeScript bundles, search, sitemaps, RSS, SEO and incremental rebuilds built in.'
layout: home
seo:
  structuredData:
    '@context': 'https://schema.org'
    '@type': 'SoftwareApplication'
    'name': 'Stati'
    'alternateName': 'Stati Static Site Generator'
    'applicationCategory': 'DeveloperApplication'
    'applicationSubCategory': 'Static Site Generator'
    'description': 'Stati is a TypeScript-first static site generator with Markdown and Eta templates, typed configuration, esbuild client bundles, and Incremental Static Generation.'
    'operatingSystem': 'Cross-platform (Node.js 22+)'
    'programmingLanguage': 'TypeScript'
    'url': 'https://stati.build/'
    'sameAs':
      - 'https://github.com/ianchak/stati'
      - 'https://www.npmjs.com/package/@stati/core'
      - 'https://www.npmjs.com/package/@stati/cli'
      - 'https://www.npmjs.com/package/create-stati'
    'offers':
      '@type': 'Offer'
      'price': '0'
      'priceCurrency': 'USD'
    'license': 'https://opensource.org/licenses/MIT'

hero:
  title: 'Lightweight static sites. Everything built in.'
  lede: 'Stati is a TypeScript-first static site generator. Write Markdown and Eta templates, and get typed config, client bundles, search, feeds, SEO and incremental rebuilds without assembling a plugin stack.'
  command: 'npx create-stati'
  specs:
    - '9 core dependencies'
    - 'No client runtime'
    - 'Node 22+'
    - 'MIT'
  config: |
    import { defineConfig } from '@stati/core';

    export default defineConfig({
      site: { title: 'Field Notes', baseUrl: 'https://example.com' },
      typescript: {
        enabled: true,
        bundles: [
          {
            entryPoint: 'search.ts',
            bundleName: 'search',
            include: ['/docs/**'],
          },
        ],
      },
      isg: { enabled: true, ttlSeconds: 21600 },
      search: { enabled: true },
      sitemap: { enabled: true },
    });

inventory:
  title: 'Everything a content site needs, in the box'
  lede: 'Every feature below ships in Stati’s own packages and is documented here. Most switch on with one line in a typed config file. No plugin hunting, no glue code.'
  groups:
    - title: 'Write'
      items:
        - {
            name: 'Markdown pipeline',
            text: 'markdown-it with plugins, heading anchors and a generated table of contents.',
            href: '/core-concepts/markdown',
          }
        - {
            name: 'Front matter',
            text: 'Titles, tags, drafts, layouts and permalinks, per page.',
            href: '/core-concepts/markdown#front-matter',
          }
        - {
            name: 'Eta layouts',
            text: 'Layouts inherit by folder, with no wiring.',
            href: '/core-concepts/templates',
          }
        - {
            name: 'Callable partials',
            text: 'Reusable components that take props.',
            href: '/api/templates',
          }
        - {
            name: 'Filesystem routing',
            text: 'Folders become URLs; permalinks override.',
            href: '/core-concepts/routing',
          }
        - {
            name: 'Navigation helpers',
            text: 'Menus and breadcrumbs from the page tree.',
            href: '/api/navigation',
          }
        - {
            name: 'Custom filters',
            text: 'Your own template helpers, defined in config.',
            href: '/configuration/templates',
          }
    - title: 'Build'
      items:
        - {
            name: 'Typed configuration',
            text: 'defineConfig() with full editor completion.',
            href: '/configuration/file',
          }
        - {
            name: 'TypeScript bundles',
            text: 'esbuild-compiled client code, injected per page.',
            href: '/configuration/typescript',
          }
        - {
            name: 'Incremental Static Generation',
            text: 'A build cache with TTLs and age-based aging rules.',
            href: '/configuration/isg',
          }
        - {
            name: 'Cache invalidation',
            text: 'Clear by tag, path or age from the CLI or API.',
            href: '/core-concepts/isg',
          }
        - {
            name: 'Build hooks',
            text: 'Run code before and after the build or each page.',
            href: '/api/hooks',
          }
        - {
            name: 'Tailwind or Sass',
            text: 'Pick plain CSS, Sass or Tailwind when you scaffold.',
            href: '/cli/scaffolder#styling-solutions',
          }
        - {
            name: 'Build metrics',
            text: 'Phase timings as JSON or an HTML report.',
            href: '/advanced/metrics',
          }
    - title: 'Publish'
      items:
        - {
            name: 'Search index',
            text: 'A JSON index for client-side search, built with the site.',
            href: '/configuration/search',
          }
        - {
            name: 'Sitemap',
            text: 'Priorities, filters and sitemap indexes.',
            href: '/configuration/seo#sitemap-configuration',
          }
        - {
            name: 'robots.txt',
            text: 'Per-agent rules generated from config.',
            href: '/configuration/seo#robots-txt-configuration',
          }
        - {
            name: 'RSS feeds',
            text: 'One or many feeds with custom item mapping.',
            href: '/configuration/rss',
          }
        - {
            name: 'SEO metadata',
            text: 'Meta tags, Open Graph and JSON-LD, injected for you.',
            href: '/configuration/seo',
          }
        - {
            name: 'Static assets',
            text: 'Everything in public/ copied to the output.',
            href: '/core-concepts/static-assets',
          }
    - title: 'Develop'
      items:
        - {
            name: 'Dev server',
            text: 'Live reload backed by incremental rebuilds.',
            href: '/cli/development',
          }
        - {
            name: 'Error overlay',
            text: 'Template and build errors shown in the browser.',
            href: '/api/error-handling',
          }
        - {
            name: 'Preview server',
            text: 'Serve the production build locally.',
            href: '/cli/commands',
          }
        - {
            name: 'Scaffolder',
            text: 'npx create-stati sets up a working project.',
            href: '/cli/scaffolder',
          }
        - {
            name: 'Agent skill',
            text: 'Teach Claude Code or Copilot to build with Stati.',
            href: '/cli/scaffolder#agent-skill',
          }

claims:
  title: 'Small to learn, typed end to end, quick to rebuild'
  items:
    - id: small
      title: 'Markdown and Eta. Nothing else to learn.'
      text: 'Pages are Markdown files with front matter. Layouts are Eta templates, plain HTML with JavaScript where you need it. No framework components, no hydration, and nothing shipped to the browser unless you add it.'
      link: { text: 'How templates work', href: '/core-concepts/templates' }
      panels:
        - file: 'site/blog/hello.md'
          lang: 'markdown'
          code: |
            ---
            title: Hello, Stati
            tags: [news]
            ---

            # Hello, Stati

            Write in **Markdown**. The layout does the rest.
        - file: 'site/layout.eta'
          lang: 'ejs'
          code: |
            <!doctype html>
            <html lang="en">
              <head><title><%= stati.page.title %></title></head>
              <body>
                <%~ stati.partials.header %>
                <main><%~ stati.content %></main>
              </body>
            </html>
    - id: typed
      title: 'TypeScript from config to client.'
      text: 'Configuration is a typed object, so your editor completes every option. Client code is TypeScript too: Stati compiles it with esbuild, hashes it for production, and injects each bundle only on the pages that match.'
      link: { text: 'TypeScript bundles', href: '/configuration/typescript' }
      panels:
        - file: 'stati.config.ts (excerpt)'
          lang: 'typescript'
          code: |
            export default defineConfig({
              typescript: {
                enabled: true,
                bundles: [
                  // On every page
                  { entryPoint: 'main.ts', bundleName: 'main' },
                  // Only where it's needed
                  {
                    entryPoint: 'search.ts',
                    bundleName: 'search',
                    include: ['/docs/**'],
                  },
                ],
              },
            });
    - id: isg
      title: 'Rebuild only what changed.'
      text: 'Incremental Static Generation keeps a build cache. A page is rebuilt when its content or templates change, or when its TTL runs out, and aging rules cache older pages for longer. Clear anything on demand by tag, path or age.'
      link: { text: 'Incremental Static Generation', href: '/core-concepts/isg' }
      panels:
        - file: 'stati.config.ts (excerpt)'
          lang: 'typescript'
          code: |
            isg: {
              enabled: true,
              // New articles: every 5 minutes
              ttlSeconds: 300,
              maxAgeCapDays: 30,
              aging: [
                // Then hourly, then daily
                { untilDays: 1, ttlSeconds: 3600 },
                { untilDays: 7, ttlSeconds: 86400 },
              ],
            },
        - file: 'terminal'
          lang: 'bash'
          code: |
            npx stati invalidate "tag:news"
      log:
        caption: 'Illustrative next build after invalidating tag:news'
        rows:
          - { path: '/', status: 'cached', reason: 'within TTL' }
          - { path: '/news/launch-day/', status: 'rebuilt', reason: 'invalidated by tag:news' }
          - { path: '/news/roadmap/', status: 'rebuilt', reason: 'invalidated by tag:news' }
          - { path: '/blog/2025-recap/', status: 'cached', reason: 'aged: cached for a day' }
          - { path: '/docs/setup/', status: 'rebuilt', reason: 'docs/layout.eta changed' }
          - { path: '/about/', status: 'rebuilt', reason: 'TTL expired' }

dogfood:
  title: 'This site is the demo'
  text: 'stati.build is built with Stati, plus Tailwind for CSS, Prism for code highlighting and FlexSearch behind the search box. The search index, sitemap, robots.txt, RSS feed and per-page script bundles all come from the config below.'
  link:
    {
      text: 'View the source on GitHub',
      href: 'https://github.com/ianchak/stati/tree/main/docs-site',
    }
  file: 'docs-site/stati.config.ts (excerpt)'
  code: |
    typescript: {
      enabled: true,
      bundles: [
        { entryPoint: 'core.ts', bundleName: 'core' },
        {
          entryPoint: 'home.ts',
          bundleName: 'home',
          include: ['/index.html', '/'],
        },
        {
          entryPoint: 'docs.ts',
          bundleName: 'docs',
          exclude: ['/index.html', '/'],
        },
      ],
    },
    isg: { enabled: true, ttlSeconds: 86400, maxAgeCapDays: 30 },
    search: { enabled: true, exclude: ['/404'] },
    sitemap: {
      enabled: true,
      defaultPriority: 0.7,
      defaultChangeFreq: 'weekly',
    },
    robots: { enabled: true, sitemap: true },
    rss: {
      enabled: true,
      feeds: [
        {
          filename: 'feed.xml',
          title: 'Stati Documentation Updates',
          description: 'Latest updates to Stati documentation',
          maxItems: 30,
        },
      ],
    },

start:
  title: 'Start your first Stati site'
  text: 'The scaffolder asks a few questions, from CSS, Sass or Tailwind to TypeScript and git, then installs dependencies. Accept the defaults for a TypeScript project like the one above, three commands from a running site.'
  commands:
    - 'npx create-stati my-site'
    - 'cd my-site'
    - 'npm run dev'
  result: 'The dev server runs on localhost:3000 by default and reloads the page every time you make changes.'
  links:
    - { text: 'Quick start', href: '/getting-started/quick-start' }
    - { text: 'Installation', href: '/getting-started/installation' }
    - { text: 'Example sites', href: '/examples/list' }
---
