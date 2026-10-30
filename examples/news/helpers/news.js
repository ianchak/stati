/**
 * Newsroom helpers for Stati. stati.config.js wires them in:
 *
 *   helpers   used in templates as `stati.helpers.frontPage(...)`, `stati.helpers.byline(...)`...
 *   generate  one page per section (/news/world) and per author (/authors/your-name)
 *   hooks     search-engine metadata on every article
 *   feeds     the site-wide RSS feed plus one per section
 *
 * Listings still come from Stati itself: every article lives in site/news/<section>/, so
 * `stati.collection` on a page with `collection: /news` holds them all, newest first, its
 * `related()` method picks the stories that share the most tags with one of them, and Stati
 * rebuilds the pages that list an article when it is added, moved, retitled or retagged.
 */

/**
 * @typedef {import('@stati/core').PageModel} PageModel
 * @typedef {import('@stati/core').StatiConfig} StatiConfig
 *
 * @typedef {object} SectionOptions
 * @property {string} key Folder name in site/news/, and the section's address: /news/<key>
 * @property {string} title
 * @property {string} [description]
 *
 * @typedef {object} AuthorOptions
 * @property {string} name
 * @property {string} [role]
 * @property {string} [bio]
 * @property {string} [email]
 * @property {string} [website]
 * @property {string} [twitter]
 *
 * @typedef {object} NewsSite
 * @property {string} title
 * @property {string} [description]
 * @property {string} baseUrl
 * @property {string} [defaultLocale]
 * @property {string} [timeZone]
 * @property {SectionOptions[]} [sections]
 * @property {Record<string, AuthorOptions>} [authors]
 *
 * @typedef {SectionOptions & { url: string }} Section
 * @typedef {AuthorOptions & { key: string, url?: string }} Author
 */

/** Article pages: /news/<section>/<slug> */
const ARTICLE_URL = /^\/news\/([^/]+)\/[^/]+$/;

/** The link preview image for pages without their own, in public/ */
const SOCIAL_CARD = '/images/social-card.png';

/** @param {unknown} value */
function toDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** @param {string} key */
function titleCase(key) {
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** @param {PageModel} page */
function tagsOf(page) {
  const tags = page.frontMatter.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim());
}

/** @param {PageModel} page */
function authorKeys(page) {
  const value = page.frontMatter.author;
  const keys = Array.isArray(value) ? value : [value];
  return keys.filter((key) => typeof key === 'string' && key.trim()).map((key) => key.trim());
}

/** @param {PageModel[]} pages Newest first */
function byDate(pages) {
  return [...pages].sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
}

/**
 * @param {{ site: NewsSite }} options
 */
export function createNews(options) {
  const { site } = options;
  const locale = site.defaultLocale ?? 'en-US';
  const timeZone = site.timeZone ?? 'UTC';
  const origin = site.baseUrl.replace(/\/+$/, '');

  /** @type {Section[]} */
  const sections = (site.sections ?? []).map((section) => ({
    ...section,
    url: `/news/${section.key}`,
  }));

  /** @type {Author[]} */
  const authors = Object.entries(site.authors ?? {}).map(([key, author]) => ({
    ...author,
    key,
    url: `/authors/${key}`,
  }));

  /** @param {string} url A path from the site root */
  const absolute = (url) => `${origin}${url}`;

  /**
   * The section an article URL belongs to. A folder that stati.config.js does not list
   * still works, titled after its name.
   * @param {string} url
   * @returns {Section | undefined}
   */
  const sectionOf = (url) => {
    const key = ARTICLE_URL.exec(url)?.[1];
    if (!key) return undefined;
    return (
      sections.find((section) => section.key === key) ?? {
        key,
        title: titleCase(key),
        url: `/news/${key}`,
      }
    );
  };

  /**
   * The article's authors from its `author` front matter: one key or a list of keys from
   * `site.authors`. Unknown keys keep their name but get no author page.
   * @param {PageModel} page
   * @returns {Author[]}
   */
  const bylineOf = (page) =>
    authorKeys(page).map(
      (key) => authors.find((author) => author.key === key) ?? { key, name: titleCase(key) },
    );

  /** @param {PageModel} page */
  const isArticle = (page) =>
    ARTICLE_URL.test(page.url) && !page.generated && !page.pagination?.pageNumber;

  /** @param {PageModel[]} pages */
  const articlesIn = (pages) => byDate(pages.filter(isArticle));

  /**
   * @param {unknown} value
   * @param {Intl.DateTimeFormatOptions} format
   */
  const format = (value, format) => {
    const date = toDate(value);
    return date ? new Intl.DateTimeFormat(locale, { timeZone, ...format }).format(date) : '';
  };

  /** @param {unknown} value Whether a date carries a time of day, rather than midnight UTC */
  const hasTime = (value) => {
    const date = toDate(value);
    return Boolean(date && (date.getUTCHours() || date.getUTCMinutes()));
  };

  /** @type {Record<string, (...args: any[]) => unknown>} */
  const helpers = {
    /** The sections from stati.config.js, in order, each with its `url`. */
    sections: () => sections,

    /** Every author from stati.config.js, each with its `key` and page `url`. */
    authors: () => authors,

    /** The section of an article URL: `{ key, title, url }`. */
    sectionOf: (url) => sectionOf(String(url)),

    /**
     * The configured section a page is in, for the section tabs and feed links: the section
     * page itself (/news/world, /news/world/page/2) or one of its articles.
     */
    sectionAt: (url) =>
      sections.find((section) => url === section.url || String(url).startsWith(`${section.url}/`)),

    /** The authors of an article, from its `author` front matter. */
    byline: (page) => bylineOf(page),

    /** Pages of a collection that are articles, newest first. */
    articles: (pages) => articlesIn(pages ?? []),

    /**
     * The front page's picks from the articles of a collection: pass `stati.collection`.
     * Each story appears once, in this order:
     *   lead     the newest article with `lead: true`, or else the newest article
     *   top      articles with `featured: true`, newest first, topped up with the newest others
     *   latest   the newest of the rest, for the strip under the nameplate
     *   more     up to two of the rest that share the most tags with the lead, from its own
     *            section first, listed under it
     *   shown    all of the above, for the section columns to leave out
     */
    frontPage: (collection, topCount = 3, latestCount = 3) => {
      const stories = articlesIn(collection?.recentPages ?? []);
      const lead = stories.find((story) => story.frontMatter.lead === true) ?? stories[0];
      const rest = stories.filter((story) => story !== lead);
      const top = [
        ...rest.filter((story) => story.frontMatter.featured === true),
        ...rest.filter((story) => story.frontMatter.featured !== true),
      ].slice(0, topCount);
      const latest = rest.filter((story) => !top.includes(story)).slice(0, latestCount);
      const taken = [lead, ...top, ...latest];
      const more = lead
        ? collection.related(lead.url, { limit: 2, sameFolderBonus: 1, exclude: taken })
        : [];
      return { lead, top, latest, more, shown: [...taken, ...more], total: stories.length };
    },

    /** The newest articles of one section, leaving out those in `exclude`. */
    inSection: (pages, key, limit = 4, exclude = []) => {
      const skip = new Set((exclude ?? []).map((page) => page?.url));
      return articlesIn(pages ?? [])
        .filter((page) => sectionOf(page.url)?.key === key && !skip.has(page.url))
        .slice(0, limit);
    },

    /** The most used topics, as `{ tag, count }`, from a collection's `pagesByTag`. */
    topTopics: (pagesByTag, limit = 8) =>
      Object.entries(pagesByTag ?? {})
        .map(([tag, pages]) => ({ tag, count: pages.length }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
        .slice(0, limit),

    /** Articles grouped by the day they were published, for the latest-news stream. */
    byDay: (pages) => {
      /** @type {{ day: string, iso: string, stories: PageModel[] }[]} */
      const days = [];
      for (const story of pages ?? []) {
        const day = format(story.publishedAt, { weekday: 'long', month: 'long', day: 'numeric' });
        const last = days.at(-1);
        if (last && last.day === day) last.stories.push(story);
        else
          days.push({
            day: day || 'Undated',
            iso: helpers.isoDate(story.publishedAt),
            stories: [story],
          });
      }
      return days;
    },

    /**
     * A date in the site's locale and time zone. Styles:
     *   'short'    Oct 25, 2026
     *   'long'     October 25, 2026, with the time when the value has one
     *   'edition'  Sunday, October 25, 2026, for the nameplate
     *   'time'     Oct 25, 9:15 AM, or Oct 25 when the value has no time
     */
    formatDate: (value, style = 'short') => {
      if (style === 'edition') {
        return format(value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      if (style === 'time') {
        return format(value, {
          month: 'short',
          day: 'numeric',
          ...(hasTime(value) && { hour: 'numeric', minute: '2-digit' }),
        });
      }
      if (style === 'long') {
        return format(value, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          ...(hasTime(value) && { hour: 'numeric', minute: '2-digit' }),
        });
      }
      return format(value, { year: 'numeric', month: 'short', day: 'numeric' });
    },

    /** Machine-readable date for `<time datetime="...">`. */
    isoDate: (value) => toDate(value)?.toISOString() ?? '',

    /** "4 min read", from the reading time Stati works out for every page. */
    readingTime: (page) => {
      const minutes = Number(page?.readingTime);
      return minutes > 0 ? `${minutes} min read` : '';
    },

    /** Initials for an author without a photo: "Your Name" gives "YN". */
    initials: (name) =>
      String(name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join(''),
  };

  /**
   * One generated page per section and per author. Section pages list the articles in
   * site/news/<key>/, author pages the articles that name the author; both paginate as
   * their templates say. Folders that stati.config.js does not list get a page too.
   *
   * @param {{ pages: PageModel[] }} context
   */
  const generate = ({ pages }) => {
    const articles = articlesIn(pages);
    const keys = [...sections.map((section) => section.key)];
    for (const article of articles) {
      const key = sectionOf(article.url)?.key;
      if (key && !keys.includes(key)) {
        keys.push(key);
        console.warn(
          `[news] site/news/${key}/ is not in site.sections in stati.config.js; it is titled "${titleCase(key)}" and has no RSS feed of its own.`,
        );
      }
    }

    return [
      ...keys.map((key) => {
        const section = /** @type {Section} */ (sectionOf(`/news/${key}/x`));
        return {
          url: section.url,
          template: 'news/[section].md',
          key,
          label: section.title,
          items: articles.filter((article) => sectionOf(article.url)?.key === key),
          data: { description: section.description ?? '' },
        };
      }),
      ...authors.map((author) => ({
        url: /** @type {string} */ (author.url),
        template: 'authors/[author].md',
        key: author.key,
        label: author.name,
        items: articles.filter((article) => authorKeys(article).includes(author.key)),
        data: {
          role: author.role ?? '',
          bio: author.bio ?? '',
          email: author.email ?? '',
          website: author.website ?? '',
          twitter: author.twitter ?? '',
        },
      })),
    ];
  };

  /**
   * Search-engine metadata for an article: `NewsArticle` structured data,
   * Open Graph article tags with section and author, and a link preview image.
   *
   * @param {PageModel} page
   * @param {boolean} generatedCards Whether @stati/images draws a card for every page
   */
  const enrichArticle = (page, generatedCards) => {
    const fm = page.frontMatter;
    const section = /** @type {Section} */ (sectionOf(page.url));
    const byline = bylineOf(page);
    for (const author of byline) {
      if (!author.url) {
        console.warn(
          `[news] ${page.sourcePath}: author "${author.key}" is not in site.authors in stati.config.js.`,
        );
      }
    }

    const image = typeof fm.image === 'string' && fm.image ? fm.image : undefined;
    const published = toDate(page.publishedAt);
    const updated = toDate(fm.updated) ?? published;
    const seo = { ...(fm.seo ?? {}) };
    const openGraph = { ...(seo.openGraph ?? {}) };

    if (image) openGraph.image ??= { url: image, alt: String(fm.imageAlt ?? '') };
    else if (!generatedCards) openGraph.image ??= { url: SOCIAL_CARD, alt: site.title };
    openGraph.article = { section: section.title, ...(openGraph.article ?? {}) };
    seo.openGraph = openGraph;

    const lead = byline[0];
    if (lead) {
      seo.author ??= {
        name: lead.name,
        ...(lead.url && { url: absolute(lead.url) }),
        ...(lead.twitter && { twitter: lead.twitter }),
      };
    }

    seo.structuredData ??= {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(page.url) },
      headline: String(fm.title ?? '').slice(0, 110),
      ...(fm.description && { description: String(fm.description) }),
      image: [absolute(image ?? SOCIAL_CARD)],
      ...(published && { datePublished: published.toISOString() }),
      ...(updated && { dateModified: updated.toISOString() }),
      author: byline.map((author) => ({
        '@type': 'Person',
        name: author.name,
        ...(author.url && { url: absolute(author.url) }),
      })),
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: site.title,
        url: absolute('/'),
        logo: {
          '@type': 'ImageObject',
          url: absolute('/images/logo.png'),
          width: 512,
          height: 512,
        },
      },
      articleSection: section.title,
      ...(tagsOf(page).length > 0 && { keywords: tagsOf(page).join(', ') }),
      isAccessibleForFree: true,
    };

    fm.seo = seo;
  };

  /**
   * The default link preview image for pages that are not articles, unless @stati/images
   * draws a card for every page.
   * @param {PageModel} page
   * @param {boolean} generatedCards
   */
  const enrichPage = (page, generatedCards) => {
    if (generatedCards) return;
    const seo = { ...(page.frontMatter.seo ?? {}) };
    seo.openGraph = { ...(seo.openGraph ?? {}) };
    seo.openGraph.image ??= { url: SOCIAL_CARD, alt: site.title };
    page.frontMatter.seo = seo;
  };

  /** @type {NonNullable<StatiConfig['hooks']>} */
  const hooks = {
    beforeAll: ({ pages, config }) => {
      const generatedCards = Boolean(config.images && config.images.og);
      for (const page of pages) {
        if (isArticle(page)) enrichArticle(page, generatedCards);
        else enrichPage(page, generatedCards);
      }
    },
  };

  /**
   * The RSS feeds: feed.xml with every article, and feed-<section>.xml for each section.
   * Articles are picked by their URL with `filter`; `contentPatterns` would match source
   * paths, folders above site/ included, so a project folder named news would match too.
   * @returns {NonNullable<StatiConfig['rss']>['feeds']}
   */
  const feeds = () => {
    const language = locale.toLowerCase();
    /** @type {NonNullable<NonNullable<StatiConfig['rss']>['feeds'][number]['itemMapping']>} */
    const itemMapping = {
      author: (page) =>
        bylineOf(page)
          .map((author) => author.name)
          .join(', ') || undefined,
      category: (page) => [sectionOf(page.url)?.title ?? '', ...tagsOf(page)].filter(Boolean),
    };
    return [
      {
        filename: 'feed.xml',
        title: site.title,
        description: site.description ?? site.title,
        link: absolute('/'),
        language,
        filter: (page) => isArticle(page) && !page.frontMatter.draft,
        maxItems: 30,
        sortBy: 'date-desc',
        itemMapping,
      },
      ...sections.map((section) => ({
        filename: `feed-${section.key}.xml`,
        title: `${section.title} · ${site.title}`,
        description: section.description ?? `${section.title} from ${site.title}`,
        link: absolute(section.url),
        language,
        filter: (page) =>
          isArticle(page) && !page.frontMatter.draft && sectionOf(page.url)?.key === section.key,
        maxItems: 20,
        sortBy: /** @type {const} */ ('date-desc'),
        itemMapping,
      })),
    ];
  };

  return { helpers, generate, hooks, feeds };
}
