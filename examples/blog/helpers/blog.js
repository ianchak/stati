/**
 * Blog helpers for Stati.
 *
 * Templates can read the navigation tree as `stati.nav`, but its nodes only
 * carry a title, URL, order and date. Listings also need each post's
 * description, tags and draft state, so this module builds an index of every
 * post in the `beforeAll` hook and exposes it to templates as filters (`stati.blogPosts()`, `stati.blogTags()`,
 * and so on). The same hook fills in article SEO metadata.
 *
 * You normally only edit `stati.config.js`. Change this file when you want
 * different listing logic, for example another sort order.
 */

import { createHash } from 'node:crypto';

/**
 * @typedef {import('@stati/core').PageModel} PageModel
 * @typedef {import('@stati/core').StatiConfig} StatiConfig
 *
 * @typedef {object} BlogPost
 * @property {string} url
 * @property {string} title
 * @property {string} description
 * @property {Date | undefined} date
 * @property {Date | undefined} updated
 * @property {string[]} tags
 * @property {boolean} draft
 *
 * @typedef {object} BlogTag
 * @property {string} name
 * @property {string} slug
 * @property {string} url
 * @property {BlogPost[]} posts
 *
 * @typedef {object} BlogOptions
 * @property {{ title: string, baseUrl: string, defaultLocale?: string }} site
 * @property {{ name: string, url?: string }} author
 * @property {string} [postsPath] URL prefix that marks a page as a post. Default `/posts/`.
 * @property {string} [tagsPath] URL of the page that lists every tag. Default `/tags`.
 * @property {{ url: string, alt: string, width: number, height: number }} [socialImage]
 *   Image used for link previews when a page does not set its own.
 */

/** @param {string} text */
export function slugifyTag(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** @param {unknown} value */
function toDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** @param {unknown} value */
function toTags(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim());
}

/** Newest first; undated posts last, alphabetically. */
function byDateDesc(/** @type {BlogPost} */ a, /** @type {BlogPost} */ b) {
  const at = a.date?.getTime() ?? -Infinity;
  const bt = b.date?.getTime() ?? -Infinity;
  return bt - at || a.title.localeCompare(b.title);
}

/**
 * @param {BlogOptions} options
 */
export function createBlog(options) {
  const postsPath = options.postsPath ?? '/posts/';
  const tagsPath = options.tagsPath ?? '/tags';
  const locale = options.site.defaultLocale ?? 'en-US';
  const baseUrl = options.site.baseUrl.replace(/\/+$/, '');

  /** @type {BlogPost[]} */
  let posts = [];
  /** @type {Map<string, BlogTag>} */
  let tags = new Map();

  /** @param {PageModel} page */
  const isPost = (page) => page.url.startsWith(postsPath) && page.url !== postsPath;

  /** @param {PageModel[]} pages */
  function buildIndex(pages) {
    posts = pages
      .filter(isPost)
      .map((page) => {
        const fm = page.frontMatter;
        return {
          url: page.url,
          title: typeof fm.title === 'string' ? fm.title : page.slug,
          description: typeof fm.description === 'string' ? fm.description : '',
          date: page.publishedAt ?? toDate(fm.publishedAt ?? fm.date),
          updated: toDate(fm.updated),
          tags: toTags(fm.tags),
          draft: fm.draft === true,
        };
      })
      .sort(byDateDesc);

    tags = new Map();
    for (const post of posts) {
      for (const name of post.tags) {
        const slug = slugifyTag(name);
        if (!slug) continue;
        if (!tags.has(slug)) {
          tags.set(slug, { name, slug, url: `${tagsPath}#${slug}`, posts: [] });
        }
        tags.get(slug)?.posts.push(post);
      }
    }
  }

  /**
   * Fingerprint of everything listings show. Stati caches pages and only
   * rebuilds a page when its own inputs change, so the fingerprint is stored
   * on every page: renaming, retagging or adding a post refreshes the home
   * page, archive, tags and neighbouring posts, while editing a post's body
   * only rebuilds that post.
   */
  function fingerprint() {
    const summary = posts.map((p) => [p.url, p.title, p.description, p.date, p.tags, p.draft]);
    return createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0, 16);
  }

  /** @param {string} url */
  const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${baseUrl}${url}`);

  /** @type {Record<string, (...args: any[]) => unknown>} */
  const filters = {
    /** All posts, newest first. Pass a number to limit the list. */
    blogPosts: (limit) => (typeof limit === 'number' ? posts.slice(0, limit) : posts),

    /** Every tag with its posts, most used first. */
    blogTags: () =>
      [...tags.values()].sort(
        (a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name),
      ),

    /** Link to a tag's section on the tags page. */
    tagUrl: (name) => `${tagsPath}#${slugifyTag(String(name))}`,

    /** Posts grouped by year, newest year first: `[{ year, posts }]`. */
    postsByYear: () => {
      /** @type {{ year: string, posts: BlogPost[] }[]} */
      const groups = [];
      for (const post of posts) {
        const year = post.date ? String(post.date.getUTCFullYear()) : 'Undated';
        const last = groups.at(-1);
        if (last && last.year === year) last.posts.push(post);
        else groups.push({ year, posts: [post] });
      }
      return groups;
    },

    /** The posts published right before and after the given one. */
    adjacentPosts: (url) => {
      const i = posts.findIndex((post) => post.url === url);
      if (i === -1) return { newer: undefined, older: undefined };
      return { newer: posts[i - 1], older: posts[i + 1] };
    },

    /**
     * Posts sharing the most tags with the given one, newest first on ties.
     * The newer and older neighbours are left out: the post layout links them already.
     */
    relatedPosts: (url, limit = 3) => {
      const i = posts.findIndex((post) => post.url === url);
      const current = posts[i];
      if (!current || current.tags.length === 0) return [];
      const skip = new Set([url, posts[i - 1]?.url, posts[i + 1]?.url]);
      const own = new Set(current.tags.map(slugifyTag));
      return posts
        .filter((post) => !skip.has(post.url))
        .map((post) => ({ post, score: post.tags.filter((t) => own.has(slugifyTag(t))).length }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post))
        .slice(0, limit)
        .map(({ post }) => post);
    },

    /**
     * Human-readable date in the site's locale. Styles: 'short' (Oct 12, 2026),
     * 'long' (October 12, 2026) and 'day' (Oct 12, for lists already grouped by year).
     */
    formatDate: (value, style = 'short') => {
      const date = toDate(value);
      if (!date) return '';
      return new Intl.DateTimeFormat(locale, {
        ...(style !== 'day' && { year: 'numeric' }),
        month: style === 'long' ? 'long' : 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    },

    /** Machine-readable date for `<time datetime="...">`. */
    isoDate: (value) => toDate(value)?.toISOString().slice(0, 10) ?? '',
  };

  /**
   * Article metadata for Stati's SEO injection: Open Graph article tags,
   * Twitter cards and BlogPosting structured data, from front matter you
   * already write. Values a page sets under `seo` in its front matter win.
   *
   * This runs in beforeAll rather than beforeRender because Stati hashes front
   * matter to decide which pages to rebuild; it must not change after rendering.
   *
   * @param {PageModel} page
   * @param {boolean} generatedCards Whether Stati generates an Open Graph image for every
   *   page (`images.og`). The site-wide social image is then left out, so each page gets
   *   its own card; a page's `image` still wins.
   */
  function addSeo(page, generatedCards) {
    const fm = page.frontMatter;
    const seo = { ...(fm.seo ?? {}) };
    const openGraph = { ...(seo.openGraph ?? {}) };
    const image = fm.image ? { url: String(fm.image), alt: String(fm.imageAlt ?? '') } : undefined;

    if (image) openGraph.image ??= image;
    else if (options.socialImage && !generatedCards) openGraph.image ??= options.socialImage;
    const hasImage = openGraph.image ? true : openGraph.image !== false && generatedCards;
    openGraph.locale ??= locale.replace('-', '_');

    if (isPost(page)) {
      const post = posts.find((p) => p.url === page.url);
      const published = post?.date?.toISOString();
      const modified = post?.updated?.toISOString();
      const imageUrl = typeof openGraph.image === 'string' ? openGraph.image : openGraph.image?.url;

      openGraph.type ??= 'article';
      openGraph.article = {
        ...(published && { publishedTime: published }),
        ...(modified && { modifiedTime: modified }),
        author: options.author.name,
        ...(post?.tags.length && { section: post.tags[0], tags: post.tags }),
        ...(openGraph.article ?? {}),
      };

      seo.structuredData ??= {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post?.title,
        description: post?.description || undefined,
        datePublished: published,
        dateModified: modified ?? published,
        author: {
          '@type': 'Person',
          name: options.author.name,
          ...(options.author.url && { url: options.author.url }),
        },
        mainEntityOfPage: absolute(page.url),
        ...(imageUrl && { image: absolute(imageUrl) }),
        ...(post?.tags.length && { keywords: post.tags.join(', ') }),
      };
    }

    seo.openGraph = openGraph;
    seo.twitter = {
      card: hasImage ? 'summary_large_image' : 'summary',
      ...(seo.twitter ?? {}),
    };
    fm.seo = seo;
  }

  /** @type {NonNullable<StatiConfig['hooks']>} */
  const hooks = {
    beforeAll: ({ pages, config }) => {
      buildIndex(pages);
      const version = fingerprint();
      const generatedCards = Boolean(config.images && config.images.og);
      for (const page of pages) {
        page.frontMatter.blogIndex = version;
        addSeo(page, generatedCards);
      }
    },
  };

  return { filters, hooks, isPost };
}
