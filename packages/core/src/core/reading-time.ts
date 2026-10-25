import { ConfigValidationError } from '../config/errors.js';
import { stripMarkdown } from '../search/generator.js';
import type { PageModel, ReadingTimeConfig, StatiConfig } from '../types/index.js';

/**
 * Words a minute when `readingTime.wordsPerMinute` is not set.
 */
export const DEFAULT_WORDS_PER_MINUTE = 230;

/**
 * Characters of scripts that are written without spaces between words. Each counts as one word.
 * Korean is not here: Hangul is written with spaces.
 */
const UNSPACED_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

/** A token that is a word: it holds a letter or a number, so a lone dash or bullet is not one. */
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Checks the `readingTime` block: an object whose `wordsPerMinute` is a positive number.
 *
 * @param readingTime - The `readingTime` value from the config file
 * @throws {ConfigValidationError} For a value that is not an object, an unknown option, or a
 *   `wordsPerMinute` that is not a positive, finite number
 */
export function validateReadingTimeConfig(readingTime: unknown): void {
  if (readingTime === undefined) {
    return;
  }
  if (typeof readingTime !== 'object' || readingTime === null || Array.isArray(readingTime)) {
    throw new ConfigValidationError(
      `readingTime must be an object such as { wordsPerMinute: 230 } (got ${describe(readingTime)}).`,
    );
  }

  for (const [key, value] of Object.entries(readingTime)) {
    if (key !== 'wordsPerMinute') {
      throw new ConfigValidationError(
        `Unknown option readingTime.${key}. Allowed options: wordsPerMinute.`,
      );
    }
    if (
      value !== undefined &&
      (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    ) {
      throw new ConfigValidationError(
        `readingTime.wordsPerMinute must be a number above 0 (got ${describe(value)}).`,
      );
    }
  }
}

/**
 * Returns the reading speed of a build.
 *
 * @param config - Stati configuration
 * @returns `readingTime.wordsPerMinute`, or the default
 */
export function resolveWordsPerMinute(config: Pick<StatiConfig, 'readingTime'>): number {
  const configured: ReadingTimeConfig | undefined = config.readingTime;
  const speed = configured?.wordsPerMinute;
  // A config that did not go through loadConfig() is not validated; never divide by 0
  return typeof speed === 'number' && Number.isFinite(speed) && speed > 0
    ? speed
    : DEFAULT_WORDS_PER_MINUTE;
}

/**
 * Counts the words of a Markdown body. Front matter is not part of the body. Fenced code blocks,
 * HTML tags, images and Markdown syntax do not count; link text and inline code do. Words are
 * runs of text between whitespace. Chinese and Japanese text has no spaces to split on, so each
 * Han, Hiragana and Katakana character counts as one word, which makes the count approximate
 * for those languages.
 *
 * @param markdown - The Markdown body of a page
 * @returns The number of words
 */
export function countWords(markdown: string): number {
  const text = stripMarkdown(markdown);
  const unspaced = text.match(UNSPACED_SCRIPT)?.length ?? 0;
  const spaced = text
    .replace(UNSPACED_SCRIPT, ' ')
    .split(/\s+/)
    .filter((token) => WORD_CHARACTER.test(token)).length;
  return unspaced + spaced;
}

/**
 * Turns a word count into whole minutes of reading, never less than 1.
 *
 * @param wordCount - Number of words
 * @param wordsPerMinute - Reading speed
 * @returns Minutes, rounded to the nearest whole minute
 */
export function computeReadingTime(wordCount: number, wordsPerMinute: number): number {
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}

/**
 * Word count and reading time of a page body.
 *
 * @param markdown - The Markdown body of a page
 * @param wordsPerMinute - Reading speed
 * @returns `wordCount` and `readingTime`, as set on a page
 */
export function computeTextStats(
  markdown: string,
  wordsPerMinute: number,
): Required<Pick<PageModel, 'wordCount' | 'readingTime'>> {
  const wordCount = countWords(markdown);
  return { wordCount, readingTime: computeReadingTime(wordCount, wordsPerMinute) };
}

/**
 * Gives the pages that have no word count or reading time theirs, from their Markdown body.
 * Pages from content files have them since they were loaded; pages a `beforeAll` hook adds do
 * not. Values a hook sets on a page stay as they are.
 *
 * @param pages - The pages of the build
 * @param config - Stati configuration
 */
export function fillTextStats(pages: PageModel[], config: StatiConfig): void {
  const wordsPerMinute = resolveWordsPerMinute(config);
  for (const page of pages) {
    page.wordCount ??= countWords(page.content);
    page.readingTime ??= computeReadingTime(page.wordCount, wordsPerMinute);
  }
}
