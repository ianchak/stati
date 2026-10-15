/**
 * Blog helpers for Stati, used in templates as `stati.relatedPosts(...)`,
 * `stati.formatDate(...)` and `stati.isoDate(...)`.
 *
 * Listings come from Stati itself: `stati.collection` holds the posts in
 * site/posts/, newest first, and Stati rebuilds every page that lists them when
 * a post is added, removed, retitled or retagged. These filters add what Stati
 * does not do for you: related posts and dates in your locale.
 */

/**
 * @typedef {import('@stati/core').PageModel} PageModel
 *
 * @typedef {object} BlogOptions
 * @property {{ defaultLocale?: string }} site
 */

/** @param {unknown} value */
function toDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** @param {PageModel} post */
function tagsOf(post) {
  const tags = post.frontMatter.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim());
}

/**
 * @param {BlogOptions} options
 */
export function createBlog(options) {
  const locale = options.site.defaultLocale ?? 'en-US';

  /** @type {Record<string, (...args: any[]) => unknown>} */
  const filters = {
    /**
     * Posts sharing the most tags with the given one, newest first on ties.
     * Pass the posts newest first: `stati.relatedPosts(stati.collection.recentPages, url)`.
     * The newer and older neighbours are left out: the post layout links them already.
     */
    relatedPosts: (posts, url, limit = 3) => {
      const i = posts.findIndex((post) => post.url === url);
      const current = posts[i];
      if (!current) return [];
      const own = new Set(tagsOf(current).map((tag) => tag.toLowerCase()));
      if (own.size === 0) return [];
      const skip = new Set([url, posts[i - 1]?.url, posts[i + 1]?.url]);
      return posts
        .filter((post) => !skip.has(post.url))
        .map((post) => ({
          post,
          score: tagsOf(post).filter((tag) => own.has(tag.toLowerCase())).length,
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
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

  return { filters };
}
