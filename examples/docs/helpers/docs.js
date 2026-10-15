/**
 * Docs helpers for Stati.
 *
 * Templates can read the whole navigation tree as `stati.nav`, but its nodes
 * only carry a title, URL, order, date and children. The sidebar also needs
 * front matter the tree leaves out: each section's description, `sidebarTitle`,
 * `sidebar: false` and drafts. So this module reads every page in the
 * `beforeAll` hook and exposes the result to templates as filters: the sidebar comes from
 * `stati.docsSections()`, the previous and next links from `stati.docsPager()`
 * and the breadcrumbs from `stati.docsBreadcrumbs()`. The same hook fills in
 * link-preview and structured-data metadata for every page.
 *
 * How pages are grouped:
 * - Every top-level folder in `site/` is a sidebar section. Its `index.md`
 *   gives the section's title, description and `order`.
 * - Every other Markdown file in that folder (or deeper) is a page of the
 *   section, sorted by `order` in its front matter, then by title.
 * - `sidebar: false` keeps a page out of the sidebar and the pager.
 * - `sidebarTitle` gives a page a shorter label in the sidebar.
 *
 * You normally only edit `stati.config.js` and your Markdown. Change this
 * file when you want different grouping, for example nested groups.
 */

import { createHash } from 'node:crypto';

/**
 * @typedef {import('@stati/core').PageModel} PageModel
 * @typedef {import('@stati/core').StatiConfig} StatiConfig
 *
 * @typedef {object} DocsPage
 * @property {string} url
 * @property {string} title
 * @property {string} label Sidebar label (`sidebarTitle`, or the title)
 * @property {string} description
 * @property {number} order
 * @property {boolean} draft
 *
 * @typedef {object} DocsSection
 * @property {string} url Section overview URL (its index.md), e.g. `/getting-started`
 * @property {string} title
 * @property {string} description
 * @property {number} order
 * @property {boolean} hasOverview Whether the section has an index.md
 * @property {DocsPage[]} pages
 *
 * @typedef {object} DocsOptions
 * @property {{ title: string, baseUrl: string, defaultLocale?: string }} site
 */

/** Trailing slashes and `/index.html` removed, so `/a/`, `/a` and `/a/index.html` match. */
export function normalizeUrl(/** @type {string} */ url) {
  const clean = String(url || '/')
    .replace(/[?#].*$/, '')
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/(.)\/+$/, '$1');
  return clean || '/';
}

/** @param {string} url */
function topFolder(url) {
  const [first] = normalizeUrl(url).split('/').filter(Boolean);
  return first ? `/${first}` : '/';
}

/** @param {string} slug */
function titleFromSlug(slug) {
  const words = slug.replace(/^\//, '').split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** @param {unknown} value */
function toOrder(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

/** Sort by `order`, then title. */
function byOrder(
  /** @type {{ order: number, title: string }} */ a,
  /** @type {{ order: number, title: string }} */ b,
) {
  return a.order - b.order || a.title.localeCompare(b.title);
}

/**
 * @param {DocsOptions} options
 */
export function createDocs(options) {
  const locale = options.site.defaultLocale ?? 'en-US';
  const baseUrl = options.site.baseUrl.replace(/\/+$/, '');

  /** @type {DocsSection[]} */
  let sections = [];
  /** Every sidebar page in reading order, across sections. @type {DocsPage[]} */
  let sequence = [];

  /** @param {PageModel[]} pages */
  function buildIndex(pages) {
    /** @type {Map<string, DocsSection>} */
    const byFolder = new Map();

    /** @param {string} folder */
    const sectionFor = (folder) => {
      let section = byFolder.get(folder);
      if (!section) {
        section = {
          url: folder,
          title: titleFromSlug(folder),
          description: '',
          order: Number.POSITIVE_INFINITY,
          hasOverview: false,
          pages: [],
        };
        byFolder.set(folder, section);
      }
      return section;
    };

    const urls = pages.map((page) => normalizeUrl(page.url));

    for (const page of pages) {
      const url = normalizeUrl(page.url);
      if (url === '/') continue;

      const folder = topFolder(url);
      const fm = page.frontMatter;
      const title = typeof fm.title === 'string' ? fm.title : titleFromSlug(page.slug ?? url);
      const description = typeof fm.description === 'string' ? fm.description : '';

      if (url === folder) {
        // A top-level page with nothing under it, such as /404, is not a section.
        if (!urls.some((other) => other.startsWith(`${url}/`))) continue;

        // Otherwise it is the section's index.md
        const section = sectionFor(folder);
        section.title = title;
        section.description = description;
        section.order = toOrder(fm.order);
        section.hasOverview = true;
        continue;
      }

      if (fm.sidebar === false) continue;

      sectionFor(folder).pages.push({
        url,
        title,
        label: typeof fm.sidebarTitle === 'string' ? fm.sidebarTitle : title,
        description,
        order: toOrder(fm.order),
        draft: fm.draft === true,
      });
    }

    sections = [...byFolder.values()].filter(
      (section) => section.pages.length > 0 || section.hasOverview,
    );
    for (const section of sections) section.pages.sort(byOrder);
    sections.sort(byOrder);
    sequence = sections.flatMap((section) => section.pages);
  }

  /**
   * Fingerprint of everything the sidebar, pager and breadcrumbs show. Stati
   * caches pages and only rebuilds a page when its own inputs change, so the
   * fingerprint is stored on every page: adding, renaming or reordering a page
   * refreshes the sidebar everywhere, while editing a page's body only
   * rebuilds that page.
   */
  function fingerprint() {
    const summary = sections.map((s) => [
      s.url,
      s.title,
      s.description,
      s.pages.map((p) => [p.url, p.label, p.title, p.description]),
    ]);
    return createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0, 16);
  }

  /** @param {string} url */
  const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${baseUrl}${url}`);

  /** @param {string} url */
  const findSection = (url) => {
    const folder = topFolder(url);
    return sections.find((section) => section.url === folder);
  };

  /** @param {string} url */
  function breadcrumbs(url) {
    const here = normalizeUrl(url);
    const section = findSection(here);
    /** @type {{ title: string, url: string }[]} */
    const crumbs = [{ title: 'Home', url: '/' }];
    if (!section) return crumbs;
    crumbs.push({ title: section.title, url: section.url });
    const page = section.pages.find((p) => p.url === here);
    if (page) crumbs.push({ title: page.title, url: page.url });
    return crumbs;
  }

  /** @type {Record<string, (...args: any[]) => unknown>} */
  const filters = {
    /** Every section with its pages, in sidebar order. */
    docsSections: () => sections,

    /** The section a URL belongs to, or undefined for pages outside sections. */
    docsSection: (url) => findSection(String(url)),

    /**
     * The pages before and after the given one in sidebar order, across
     * sections. On a section overview, "next" is the section's first page.
     */
    docsPager: (url) => {
      const here = normalizeUrl(String(url));
      let i = sequence.findIndex((page) => page.url === here);
      if (i !== -1) return { prev: sequence[i - 1], next: sequence[i + 1] };
      const section = sections.find((s) => s.url === here);
      const first = section?.pages[0];
      if (!first) return { prev: undefined, next: undefined };
      i = sequence.indexOf(first);
      return { prev: sequence[i - 1], next: first };
    },

    /** Home, section and page, for the breadcrumb trail. */
    docsBreadcrumbs: (url) => breadcrumbs(String(url)),

    /** True when two URLs point at the same page (ignores trailing slashes). */
    isCurrent: (a, b) => normalizeUrl(String(a)) === normalizeUrl(String(b)),
  };

  /**
   * Link-preview and structured-data metadata for Stati's SEO injection:
   * Open Graph, Twitter cards and a BreadcrumbList, from front matter you
   * already write. Values a page sets under `seo` in its front matter win.
   *
   * This runs in beforeAll rather than beforeRender because Stati hashes front
   * matter to decide which pages to rebuild; it must not change after rendering.
   *
   * @param {PageModel} page
   * @param {boolean} generatedCards Whether Stati draws an Open Graph card for every page
   *   (`images.og`, with @stati/images). Pages without their own `image` then use it.
   */
  function addSeo(page, generatedCards) {
    const fm = page.frontMatter;
    const seo = { ...(fm.seo ?? {}) };
    const openGraph = { ...(seo.openGraph ?? {}) };

    // A page's own link-preview image; without one it gets the generated card, if any
    if (fm.image) openGraph.image ??= { url: String(fm.image), alt: String(fm.imageAlt ?? '') };
    const hasImage = openGraph.image ? true : openGraph.image !== false && generatedCards;
    openGraph.locale ??= locale.replace('-', '_');
    openGraph.siteName ??= options.site.title;
    seo.openGraph = openGraph;

    seo.twitter = {
      card: hasImage ? 'summary_large_image' : 'summary',
      ...(seo.twitter ?? {}),
    };

    const crumbs = breadcrumbs(page.url);
    if (crumbs.length > 1) {
      seo.structuredData ??= {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.title,
          item: absolute(crumb.url),
        })),
      };
    }

    fm.seo = seo;
  }

  /** @type {NonNullable<StatiConfig['hooks']>} */
  const hooks = {
    beforeAll: ({ pages, config }) => {
      buildIndex(pages);
      const version = fingerprint();
      const generatedCards = Boolean(config.images && config.images.og);
      for (const page of pages) {
        page.frontMatter.docsIndex = version;
        addSeo(page, generatedCards);
      }
    },
  };

  return { filters, hooks };
}
