import type { CacheEntry } from '../../types/index.js';
import { isTemplateLookupList } from '../template-index.js';

/**
 * Why {@link parseCacheEntry} rejected a cache entry.
 */
export interface InvalidCacheEntry {
  /** What is wrong with the entry, such as `"ttlSeconds" must be a finite number of 0 or more` */
  reason: string;
}

/**
 * The rule for one field of a cache entry.
 */
interface FieldRule {
  /** Whether every entry must have the field */
  required: boolean;
  /** Whether a value of the field is valid */
  valid: (value: unknown) => boolean;
  /** What a valid value is, for the reason an entry is rejected */
  mustBe: string;
}

const isString = (value: unknown): boolean => typeof value === 'string';

const isBoolean = (value: unknown): boolean => typeof value === 'boolean';

const isStringList = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');

const isDateString = (value: unknown): boolean =>
  typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * A rule for every field of {@link CacheEntry}: a field added to the type fails to compile
 * until it has one.
 */
const FIELD_RULES: { readonly [Field in keyof CacheEntry]-?: FieldRule } = {
  path: { required: true, valid: isString, mustBe: 'a string' },
  inputsHash: { required: true, valid: isString, mustBe: 'a string' },
  deps: { required: true, valid: isStringList, mustBe: 'an array of strings' },
  tags: { required: true, valid: isStringList, mustBe: 'an array of strings' },
  renderedAt: { required: true, valid: isDateString, mustBe: 'a valid date string' },
  ttlSeconds: {
    required: true,
    valid: (value) => isFiniteNumber(value) && value >= 0,
    mustBe: 'a finite number of 0 or more',
  },
  publishedAt: { required: false, valid: isDateString, mustBe: 'a valid date string' },
  maxAgeCapDays: {
    required: false,
    valid: (value) => isFiniteNumber(value) && value > 0,
    mustBe: 'a finite number above 0',
  },
  templateLookups: {
    required: false,
    valid: isTemplateLookupList,
    mustBe: 'a list of { name, from?, file } objects',
  },
  templatesRecorded: { required: false, valid: isBoolean, mustBe: 'a boolean' },
  assetDeps: { required: false, valid: isStringList, mustBe: 'an array of strings' },
  images: { required: false, valid: isStringList, mustBe: 'an array of strings' },
  readsCollection: { required: false, valid: isBoolean, mustBe: 'a boolean' },
  readsNav: { required: false, valid: isBoolean, mustBe: 'a boolean' },
};

/**
 * Checks a cache entry read from the manifest. This is the one place that says what an entry
 * may hold, so the code that decides whether a page rebuilds trusts the entries it gets: dates
 * parse, `ttlSeconds` is a finite number of 0 or more, and `maxAgeCapDays` is above 0.
 * Optional fields may be missing; fields the type does not know are kept as they are.
 *
 * @param raw - The entry as it was parsed from JSON
 * @returns The entry, or why it is invalid
 *
 * @example
 * ```typescript
 * const parsed = parseCacheEntry(JSON.parse(text).entries['/about.html']);
 * if ('reason' in parsed) {
 *   logger.warning(`Invalid cache entry for /about.html: ${parsed.reason}`);
 * }
 * ```
 */
export function parseCacheEntry(raw: unknown): CacheEntry | InvalidCacheEntry {
  if (!raw || typeof raw !== 'object') {
    return { reason: 'not an object' };
  }

  const entry = raw as Record<string, unknown>;
  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    const value = entry[field];
    if (!rule.required && value === undefined) {
      continue;
    }
    if (rule.required && !(field in entry)) {
      return { reason: `missing required field "${field}"` };
    }
    if (!rule.valid(value)) {
      return { reason: `"${field}" must be ${rule.mustBe}` };
    }
  }

  return raw as CacheEntry;
}
