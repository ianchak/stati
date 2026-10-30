/**
 * Blog helpers for Stati, used in templates as `stati.helpers.formatDate(...)`
 * and `stati.helpers.isoDate(...)`.
 *
 * Listings come from Stati itself: `stati.collection` holds the posts in
 * site/posts/, newest first, and `stati.collection.related()` picks the posts
 * that share the most tags with one of them. Stati rebuilds every page that
 * lists them when a post is added, removed, retitled or retagged. These helpers
 * add what Stati does not do for you: dates in your locale.
 */

/**
 * @typedef {object} BlogOptions
 * @property {{ defaultLocale?: string }} site
 */

/** @param {unknown} value */
function toDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * @param {BlogOptions} options
 */
export function createBlog(options) {
  const locale = options.site.defaultLocale ?? 'en-US';

  /** @type {Record<string, (...args: any[]) => unknown>} */
  const helpers = {
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

  return { helpers };
}
