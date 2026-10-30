/**
 * Site-wide SEO defaults: the Open Graph locale, Twitter handles, article metadata and the 404
 * page's noindex that Stati derives from configuration and from each page, for the values front
 * matter leaves out.
 * @module seo/defaults
 */

import type { StatiConfig } from '../types/config.js';
import type {
  AuthorConfig,
  OpenGraphArticle,
  OpenGraphConfig,
  PageModel,
  SEOMetadata,
  TwitterCardConfig,
} from '../types/content.js';
import type { Logger } from '../types/logging.js';
import { ConfigValidationError } from '../config/errors.js';
import {
  compileUrlPatterns,
  getPagePublishedDate,
  isNotFoundPage,
  parseDateValue,
} from '../core/utils/index.js';
import { parseRobotsDirectives } from './utils/index.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A front matter value counts as left out when it is absent, empty in YAML (`null`) or `''`. */
function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Whether a `seo.robots` value says whether the page may be indexed: a string with an `index`,
 * `noindex`, `all` or `none` directive, or an object that sets `index`. Values such as
 * `nofollow` leave that open.
 */
function robotsDecidesIndexing(robots: unknown): boolean {
  if (typeof robots === 'string') {
    return parseRobotsDirectives(robots).some((directive) =>
      ['index', 'noindex', 'all', 'none'].includes(directive),
    );
  }
  return isPlainObject(robots) && !isMissing(robots.index);
}

/**
 * Converts a BCP 47 language tag, such as `site.defaultLocale`, to the `language_TERRITORY`
 * form Open Graph uses: the language in lower case and the region in upper case.
 *
 * @param locale - A language tag; `_` separators are accepted too
 * @returns The Open Graph locale, or `undefined` when the tag has no two-letter region
 *
 * @example
 * ```typescript
 * toOpenGraphLocale('en-US'); // 'en_US'
 * toOpenGraphLocale('pt-br'); // 'pt_BR'
 * toOpenGraphLocale('zh-Hant-TW'); // 'zh_TW' (the script is dropped)
 * toOpenGraphLocale('en'); // undefined
 * ```
 */
export function toOpenGraphLocale(locale: string): string | undefined {
  const [language, ...subtags] = locale.trim().split(/[-_]/);
  if (!language || !/^[a-z]{2,3}$/i.test(language)) {
    return undefined;
  }
  // language-extlang-script-region: up to three extended language subtags, then a script
  let i = 0;
  while (i < 3 && /^[a-z]{3}$/i.test(subtags[i] ?? '')) i++;
  if (/^[a-z]{4}$/i.test(subtags[i] ?? '')) i++;
  const region = subtags[i] ?? '';
  return /^[a-z]{2}$/i.test(region)
    ? `${language.toLowerCase()}_${region.toUpperCase()}`
    : undefined;
}

/**
 * Normalizes a Twitter/X handle to the `@username` form.
 *
 * @param value - A handle with or without `@`
 * @returns The handle with one leading `@`, or `undefined` for anything but a non-empty string
 */
export function toTwitterHandle(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const name = value.trim().replace(/^@+/, '');
  return name ? `@${name}` : undefined;
}

/**
 * Compiles `seo.articles`: globs that must match the whole URL, so `/blog` matches `/blog` but
 * not `/blog/post`.
 *
 * @param config - Site configuration
 * @param logger - Receives a warning for each pattern that is not a valid glob
 */
function compileArticlePatterns(config: StatiConfig, logger?: Logger) {
  const articles = config.seo?.articles;
  return {
    include: compileUrlPatterns(articles?.include, { option: 'seo.articles.include', logger }),
    exclude: compileUrlPatterns(articles?.exclude, { option: 'seo.articles.exclude', logger }),
  };
}

/**
 * Whether `seo.articles` makes the page an article. Generated pages and the pages of a
 * paginated listing never are, as they are never collection members.
 *
 * @param page - The page
 * @param config - Site configuration
 */
export function isArticlePage(page: PageModel, config: StatiConfig): boolean {
  if (!config.seo?.articles || page.generated || page.pagination) {
    return false;
  }
  // Runs several times for every page; the patterns are converted once and cached, and
  // applySEODefaults reports the invalid ones once per build
  const articles = compileArticlePatterns(config);
  return !articles.exclude(page.url) && articles.include(page.url);
}

/** The page's own author when its front matter names one, otherwise the default author. */
function resolveAuthor(seo: SEOMetadata | undefined, config: StatiConfig): unknown {
  return isMissing(seo?.author) ? config.seo?.defaultAuthor : seo?.author;
}

/** A field of an author object, or `undefined` for a name-only author. */
function authorField(author: unknown, field: keyof AuthorConfig): unknown {
  return isPlainObject(author) ? author[field] : undefined;
}

/**
 * A front matter date as ISO 8601, or `undefined` when it is not a valid date, read with
 * `parseDateValue` like every other front matter date.
 */
function toISODate(value: unknown): string | undefined {
  return parseDateValue(value)?.toISOString();
}

/** Copies `target` with `fill` added, or returns it as it was when there is nothing to add. */
function withDefaults<T extends object>(target: unknown, fill: Partial<T>): T | undefined {
  if (Object.keys(fill).length === 0) {
    return target as T | undefined;
  }
  return { ...(isPlainObject(target) ? target : {}), ...fill } as T;
}

function resolveArticle(
  page: PageModel,
  config: StatiConfig,
  seo: SEOMetadata | undefined,
  article: unknown,
): OpenGraphArticle | undefined {
  if (!isMissing(article) && !isPlainObject(article)) {
    return article as OpenGraphArticle;
  }
  const own = isPlainObject(article) ? article : {};
  const fill: OpenGraphArticle = {};

  if (isMissing(own.publishedTime)) {
    const published = getPagePublishedDate(page)?.toISOString();
    if (published) fill.publishedTime = published;
  }
  if (isMissing(own.modifiedTime)) {
    const updated = toISODate(page.frontMatter.updated);
    if (updated) fill.modifiedTime = updated;
  }
  if (isMissing(own.tags) && Array.isArray(page.frontMatter.tags)) {
    const tags = page.frontMatter.tags.filter(
      (tag): tag is string => typeof tag === 'string' && tag !== '',
    );
    if (tags.length > 0) fill.tags = tags;
  }
  if (isMissing(own.author)) {
    const url = authorField(resolveAuthor(seo, config), 'url');
    if (typeof url === 'string' && url !== '') fill.author = url;
  }

  return withDefaults<OpenGraphArticle>(article, fill);
}

function resolveOpenGraph(
  page: PageModel,
  config: StatiConfig,
  seo: SEOMetadata | undefined,
): OpenGraphConfig | undefined {
  const og: unknown = seo?.openGraph;
  if (!isMissing(og) && !isPlainObject(og)) {
    return og as OpenGraphConfig;
  }
  const own = isPlainObject(og) ? og : {};
  const fill: OpenGraphConfig = {};

  const defaultLocale = config.site.defaultLocale;
  if (isMissing(own.locale) && typeof defaultLocale === 'string') {
    const locale = toOpenGraphLocale(defaultLocale);
    if (locale) fill.locale = locale;
  }

  if (isArticlePage(page, config)) {
    if (isMissing(own.type)) fill.type = 'article';
    // A page that sets another type prints no article tags, so none are filled in
    if ((fill.type ?? own.type) === 'article') {
      const article = resolveArticle(page, config, seo, own.article);
      if (article !== own.article) fill.article = article as OpenGraphArticle;
    }
  }

  return withDefaults<OpenGraphConfig>(og, fill);
}

function resolveTwitter(
  config: StatiConfig,
  seo: SEOMetadata | undefined,
): TwitterCardConfig | undefined {
  const twitter: unknown = seo?.twitter;
  if (!isMissing(twitter) && !isPlainObject(twitter)) {
    return twitter as TwitterCardConfig;
  }
  const own = isPlainObject(twitter) ? twitter : {};
  const fill: TwitterCardConfig = {};

  if (isMissing(own.site)) {
    const site = toTwitterHandle(config.seo?.twitter?.site);
    if (site) fill.site = site;
  }
  // Never the author's name: twitter:creator takes a handle
  if (isMissing(own.creator)) {
    const creator = toTwitterHandle(authorField(resolveAuthor(seo, config), 'twitter'));
    if (creator) fill.creator = creator;
  }

  return withDefaults<TwitterCardConfig>(twitter, fill);
}

/**
 * Returns the page's front matter `seo` with the site-wide defaults filled into each value it
 * leaves out:
 *
 * - `openGraph.locale` from `site.defaultLocale`, converted with {@link toOpenGraphLocale}
 * - `twitter.site` from `seo.twitter.site`
 * - `twitter.creator` from the page's own `seo.author.twitter`, or from
 *   `seo.defaultAuthor.twitter` when the page names no author
 * - on pages that `seo.articles` matches, `openGraph.type` as `article` and
 *   `openGraph.article` from the publish date, `updated`, `tags` and the author's `url`
 * - on the site's 404 page, `noindex` unless the page sets `noindex`, or `robots` that says
 *   whether to index it: requested by its own URL, the page is an ordinary file, which most
 *   hosts send with a 200
 *
 * Front matter wins value by value. Objects that change are copied, never modified, so
 * resolving twice gives the same result and objects shared between pages stay as they were.
 *
 * @param page - The page
 * @param config - Site configuration
 * @returns The resolved `seo`, or the page's own value when there is nothing to fill in
 */
export function resolveSEODefaults(page: PageModel, config: StatiConfig): SEOMetadata | undefined {
  const seo: unknown = page.frontMatter.seo;
  if (!isMissing(seo) && !isPlainObject(seo)) {
    return seo as SEOMetadata;
  }
  const own = isPlainObject(seo) ? (seo as SEOMetadata) : undefined;
  const fill: SEOMetadata = {};

  const openGraph = resolveOpenGraph(page, config, own);
  if (openGraph !== own?.openGraph) fill.openGraph = openGraph as OpenGraphConfig;
  const twitter = resolveTwitter(config, own);
  if (twitter !== own?.twitter) fill.twitter = twitter as TwitterCardConfig;
  if (isNotFoundPage(page) && isMissing(own?.noindex) && !robotsDecidesIndexing(own?.robots)) {
    fill.noindex = true;
  }

  return withDefaults<SEOMetadata>(seo, fill);
}

/**
 * Fills the site-wide SEO defaults into the front matter of every page, with
 * {@link resolveSEODefaults}. Runs after the `beforeAll` hook, so values the hook writes win,
 * and before pages are hashed, so changing a default rebuilds the pages it changes. Templates
 * read the same values as `stati.page.seo` that the generated tags print.
 *
 * @param pages - Every page of the build
 * @param config - Site configuration
 * @param logger - Reports `seo.articles` patterns that are not valid globs and, under
 *   `seo.debug`, a `site.defaultLocale` without a region
 */
export function applySEODefaults(pages: PageModel[], config: StatiConfig, logger: Logger): void {
  // isArticlePage skips invalid seo.articles patterns on every page; report them once
  compileArticlePatterns(config, logger);

  const defaultLocale = config.site.defaultLocale;
  if (config.seo?.debug && typeof defaultLocale === 'string' && defaultLocale !== '') {
    if (!toOpenGraphLocale(defaultLocale)) {
      logger.warning(
        `[SEO] site.defaultLocale "${defaultLocale}" has no region, so og:locale is left out ` +
          '(Open Graph then assumes en_US). Use a tag with a region, such as "en-US", or set ' +
          'seo.openGraph.locale in front matter.',
      );
    }
  }

  for (const page of pages) {
    fillDefaults(page, config);
  }
}

/**
 * Fills the defaults in again after the `beforeRender` hook, which can change what they come
 * from, such as the page's author, tags or URL. Values the hook set or changed are kept; values
 * Stati filled in and the hook left as they were are worked out again from the page as it is now.
 *
 * @param page - The page about to render
 * @param config - Site configuration
 */
export function refreshSEODefaults(page: PageModel, config: StatiConfig): void {
  let seo: unknown = page.frontMatter.seo;
  for (const { path, value } of filledValues.get(page) ?? []) {
    if (valueAt(seo, path) === value) {
      // The value is there, so every object on its path is too
      seo = withoutValue(seo as Record<string, unknown>, path);
    }
  }
  if (seo !== page.frontMatter.seo) {
    page.frontMatter.seo = seo as SEOMetadata;
  }
  fillDefaults(page, config);
}

/** Where in `seo` Stati fills in values */
const DEFAULT_PATHS: ReadonlyArray<readonly string[]> = [
  ['openGraph', 'locale'],
  ['openGraph', 'type'],
  ['openGraph', 'article', 'publishedTime'],
  ['openGraph', 'article', 'modifiedTime'],
  ['openGraph', 'article', 'tags'],
  ['openGraph', 'article', 'author'],
  ['twitter', 'site'],
  ['twitter', 'creator'],
  ['noindex'],
];

/** The values Stati filled into each page's front matter, for {@link refreshSEODefaults} */
const filledValues = new WeakMap<PageModel, Array<{ path: readonly string[]; value: unknown }>>();

/** Writes the resolved defaults into the page's front matter and records what they added. */
function fillDefaults(page: PageModel, config: StatiConfig): void {
  const own = page.frontMatter.seo;
  const seo = resolveSEODefaults(page, config);
  if (seo === undefined || seo === own) {
    filledValues.delete(page);
    return;
  }
  page.frontMatter.seo = seo;
  filledValues.set(
    page,
    DEFAULT_PATHS.filter(
      (path) => isMissing(valueAt(own, path)) && !isMissing(valueAt(seo, path)),
    ).map((path) => ({ path, value: valueAt(seo, path) })),
  );
}

function valueAt(target: unknown, path: readonly string[]): unknown {
  let value = target;
  for (const key of path) {
    if (!isPlainObject(value)) return undefined;
    value = value[key];
  }
  return value;
}

/**
 * Copies `target` without the value at `path`, which must exist, copying only the objects on
 * the way to it. An object the removal leaves empty is removed too.
 */
function withoutValue(
  target: Record<string, unknown>,
  path: readonly string[],
): Record<string, unknown> {
  const [key = '', ...rest] = path;
  const child = target[key];
  if (rest.length > 0 && isPlainObject(child)) {
    const stripped = withoutValue(child, rest);
    if (Object.keys(stripped).length > 0) {
      return { ...target, [key]: stripped };
    }
  }
  return Object.fromEntries(Object.entries(target).filter(([name]) => name !== key));
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function checkKeys(value: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new ConfigValidationError(
        `Unknown option ${path}.${key}. Allowed options: ${allowed.join(', ')}.`,
      );
    }
  }
}

/**
 * Validates the SEO options that fill in defaults: `seo.defaultAuthor.twitter`,
 * `seo.twitter` and `seo.articles`.
 *
 * @param seo - The `seo` value from the config
 * @throws {ConfigValidationError} When one of these options has the wrong type
 */
export function validateSEOConfig(seo: unknown): void {
  if (seo === undefined) {
    return;
  }
  if (!isPlainObject(seo)) {
    throw new ConfigValidationError(`seo must be an object (got ${describe(seo)}).`);
  }

  const author = seo.defaultAuthor;
  if (isPlainObject(author) && author.twitter !== undefined && typeof author.twitter !== 'string') {
    throw new ConfigValidationError(
      `seo.defaultAuthor.twitter must be a handle such as '@example' (got ${describe(author.twitter)}).`,
    );
  }

  const twitter = seo.twitter;
  if (twitter !== undefined) {
    if (!isPlainObject(twitter)) {
      throw new ConfigValidationError(
        `seo.twitter must be an object such as { site: '@example' } (got ${describe(twitter)}).`,
      );
    }
    checkKeys(twitter, ['site'], 'seo.twitter');
    if (twitter.site !== undefined && typeof twitter.site !== 'string') {
      throw new ConfigValidationError(
        `seo.twitter.site must be a handle such as '@example' (got ${describe(twitter.site)}).`,
      );
    }
  }

  const articles = seo.articles;
  if (articles !== undefined) {
    if (!isPlainObject(articles)) {
      throw new ConfigValidationError(
        `seo.articles must be an object such as { include: ['/blog/*'] } (got ${describe(articles)}).`,
      );
    }
    checkKeys(articles, ['include', 'exclude'], 'seo.articles');
    if (!isStringArray(articles.include)) {
      throw new ConfigValidationError(
        `seo.articles.include must be an array of URL glob patterns, such as ['/blog/*'] (got ${describe(articles.include)}).`,
      );
    }
    if (articles.exclude !== undefined && !isStringArray(articles.exclude)) {
      throw new ConfigValidationError(
        `seo.articles.exclude must be an array of URL glob patterns (got ${describe(articles.exclude)}).`,
      );
    }
  }
}
