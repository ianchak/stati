/**
 * Centralized constants for Stati static site generator.
 * This module contains all magic constants used throughout the Stati core package.
 */

// === Directory and File System Constants ===

/** Default source directory for content files */
export const DEFAULT_SRC_DIR = 'site';

/** Default output directory for built files */
export const DEFAULT_OUT_DIR = 'dist';

/** Default static assets directory */
export const DEFAULT_STATIC_DIR = 'public';

/** Stati cache directory name */
export const CACHE_DIR_NAME = '.stati';

/** Cache subdirectory for ISG manifest and related files */
export const CACHE_SUBDIR = 'cache';

/** ISG cache manifest filename */
export const MANIFEST_FILENAME = 'manifest.json';

// === Configuration File Constants ===

/** Supported configuration file extensions in order of preference */
export const CONFIG_FILE_EXTENSIONS = ['.ts', '.js', '.mjs'] as const;

/** Configuration file base name */
export const CONFIG_FILE_BASE = 'stati.config';

/** Complete configuration file patterns */
export const CONFIG_FILE_PATTERNS = CONFIG_FILE_EXTENSIONS.map(
  (ext) => `${CONFIG_FILE_BASE}${ext}`,
);

// === Development Server Constants ===

/** Default development server port */
export const DEFAULT_DEV_PORT = 3000;

/** Default preview server port */
export const DEFAULT_PREVIEW_PORT = 4000;

/** Default development server host */
export const DEFAULT_DEV_HOST = 'localhost';

/** Default development server base URL */
export const DEFAULT_DEV_BASE_URL = `http://${DEFAULT_DEV_HOST}:${DEFAULT_DEV_PORT}`;

// === ISG (Incremental Static Generation) Constants ===

/** Default TTL for cached pages in seconds (6 hours) */
export const DEFAULT_TTL_SECONDS = 21600;

/** Default maximum age cap for aging rules in days (1 year) */
export const DEFAULT_MAX_AGE_CAP_DAYS = 365;

/** Clock drift tolerance in milliseconds to prevent rebuild loops */
export const CLOCK_DRIFT_TOLERANCE_MS = 30000; // 30 seconds

// === Time Constants (for convenience and clarity) ===

/** Seconds in one minute */
export const SECONDS_PER_MINUTE = 60;

/** Seconds in one hour */
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;

/** Seconds in one day */
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

/** Seconds in one week */
export const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

/** Milliseconds in one day */
export const MILLISECONDS_PER_DAY = SECONDS_PER_DAY * 1000;

// === Common ISG TTL Values ===

/** 5 minutes in seconds - for very fresh content */
export const TTL_5_MINUTES = 5 * SECONDS_PER_MINUTE;

/** 30 minutes in seconds - for recent content */
export const TTL_30_MINUTES = 30 * SECONDS_PER_MINUTE;

/** 1 hour in seconds - for hourly updates */
export const TTL_1_HOUR = SECONDS_PER_HOUR;

/** 2 hours in seconds - for bi-hourly updates */
export const TTL_2_HOURS = 2 * SECONDS_PER_HOUR;

/** 6 hours in seconds - default TTL */
export const TTL_6_HOURS = DEFAULT_TTL_SECONDS;

/** 1 day in seconds - for daily content */
export const TTL_1_DAY = SECONDS_PER_DAY;

/** 1 week in seconds - for weekly content */
export const TTL_1_WEEK = SECONDS_PER_WEEK;

// === Template and File Extension Constants ===

/** Eta template file extension */
export const TEMPLATE_EXTENSION = '.eta';

/** Markdown file extension */
export const MARKDOWN_EXTENSION = '.md';

/** Layout template filename */
export const LAYOUT_TEMPLATE = `layout${TEMPLATE_EXTENSION}`;

/** Partials directory prefix (folders starting with underscore) */
export const PARTIALS_DIR_PREFIX = '_';

// === Site Configuration Defaults ===

/** Default site title */
export const DEFAULT_SITE_TITLE = 'My Stati Site';

/** Default locale for internationalization */
export const DEFAULT_LOCALE = 'en-US';
