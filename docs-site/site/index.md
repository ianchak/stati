---
title: 'Stati Documentation'
description: 'Stati turns Markdown, Eta, and typed client code into fast, cache-aware sites.'
layout: home
seo:
  structuredData:
    '@context': 'https://schema.org'
    '@type': 'SoftwareApplication'
    'name': 'Stati'
    'alternateName': 'Stati Static Site Generator'
    'applicationCategory': 'DeveloperApplication'
    'applicationSubCategory': 'Static Site Generator'
    'description': 'Stati is a TypeScript-first static site generator with zero-config setup, fast esbuild bundling, and file-based routing.'
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
  title: 'TypeScript in. Static HTML out.'
  subtitle: 'Stati turns Markdown, Eta, and typed client code into fast, cache-aware sites.'
  buttons:
    - text: 'Get started'
      url: '/getting-started/introduction'
      primary: true
    - text: 'Read the architecture'
      url: '/core-concepts/overview'
      primary: false
  source:
    label: 'stati.config.ts'
    lines:
      - "import { defineConfig } from '@stati/core';"
      - ''
      - 'export default defineConfig({'
      - "  srcDir: 'site',"
      - "  outDir: 'dist',"
      - "  staticDir: 'public',"
      - '  markdown: { toc: true },'
      - '  search: { enabled: true },'
      - '  isg: { ttlSeconds: 900 }'
      - '});'
  output:
    label: 'Generated output'
    rows:
      - path: '/index.html'
        note: 'homepage emitted'
      - path: '/core-concepts/overview/index.html'
        note: 'docs route emitted'
      - path: '/search-index.json'
        note: 'search index emitted'
      - path: '/.stati/cache/manifest.json'
        note: 'cache state tracked'
buildPath:
  title: 'From source content to reusable output.'
  subtitle: 'Each stage maps to the real Stati pipeline.'
  steps:
    - token: 'site/*.md'
      label: 'content'
      detail: 'read Markdown and frontmatter'
    - token: 'markdown-it'
      label: 'transform'
      detail: 'convert Markdown to HTML'
    - token: '.eta'
      label: 'compose'
      detail: 'apply templates and partials'
    - token: 'dist/*.html'
      label: 'emit'
      detail: 'write static pages'
    - token: '.stati/cache'
      label: 'reuse'
      detail: 'persist incremental build state'
features:
  title: 'The build stays understandable.'
  subtitle: 'TypeScript and ISG lead the map, with real routing, markdown, config, and CLI artifacts.'
  items:
    - title: 'TypeScript-first bundle routing'
      description: 'Typed bundle definitions keep route-level JavaScript explicit.'
      span: 'large'
      icon: 'code-bracket'
      artifact:
        label: 'typescript.bundles[]'
        lines:
          - "{ entryPoint: 'home.ts', bundleName: 'home', include: ['index.md'] }"
    - title: 'ISG cache manifest'
      description: 'Incremental rebuild state is persisted and queried by path, tags, and age.'
      span: 'large'
      icon: 'arrow-path'
      artifact:
        label: '.stati/cache/manifest.json'
        lines:
          - '{ "path": "index.html", "ttlSeconds": 900, "tags": ["docs"] }'
    - title: 'Filesystem routing'
      description: 'Content structure maps directly to output routes.'
      icon: 'document-text'
      artifact:
        label: 'Route path'
        value: '/core-concepts/isg/index.html'
    - title: 'Markdown transform'
      description: 'markdown-it plus plugins handles headings, links, and syntax output.'
      icon: 'document-text'
      artifact:
        label: 'Config fragment'
        value: "markdown: { plugins: [['external-links', { externalTarget: '_blank' }]] }"
    - title: 'Configuration surface'
      description: 'defineConfig keeps site, markdown, ISG, and SEO settings in one typed file.'
      icon: 'document-text'
    - title: 'Tooling workflow'
      description: 'Scaffold, build, and invalidate through documented CLI commands.'
      icon: 'wrench-screwdriver'
      artifact:
        label: 'CLI command'
        value: 'stati invalidate tag:news'
quickStart:
  title: 'Get Started in Minutes'
  subtitle: 'Create a new Stati site with a single command.'
  commands:
    - comment: 'Create a new Stati site with the interactive scaffolder'
      parts:
        - text: 'npx'
          color: 'yellow'
        - text: 'create-stati'
          color: 'white'
  link:
    text: 'View detailed installation guide'
    url: '/getting-started/installation'
---
