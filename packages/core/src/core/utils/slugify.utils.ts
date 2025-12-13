/**
 * Slugify utilities for generating URL-friendly anchor IDs.
 * @module core/utils/slugify
 */

/**
 * Common character transliteration map for accented/special characters.
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // Latin extended characters
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  å: 'a',
  æ: 'ae',
  ç: 'c',
  č: 'c',
  ć: 'c',
  ð: 'd',
  đ: 'd',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ě: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ł: 'l',
  ñ: 'n',
  ń: 'n',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ø: 'o',
  œ: 'oe',
  ř: 'r',
  š: 's',
  ś: 's',
  ß: 'ss',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ů: 'u',
  ű: 'u',
  ý: 'y',
  ÿ: 'y',
  ž: 'z',
  ź: 'z',
  ż: 'z',
  // Additional common characters
  þ: 'th',
};

/**
 * Converts a string to a URL-friendly slug.
 * Used for generating heading anchor IDs.
 *
 * @param text - The text to slugify
 * @returns A URL-friendly slug
 *
 * @example
 * ```typescript
 * slugify('Hello World') // 'hello-world'
 * slugify('Getting Started!') // 'getting-started'
 * slugify('  Multiple   Spaces  ') // 'multiple-spaces'
 * slugify('Héllo Wörld') // 'hello-world'
 * slugify('Cats & Dogs') // 'cats-and-dogs'
 * ```
 */
export function slugify(text: string): string {
  // Handle null, undefined, or non-string input defensively
  if (text === null || text === undefined) {
    return '';
  }

  // Coerce to string if needed
  const input = String(text);

  return (
    input
      .toLowerCase()
      .trim()
      // Normalize unicode (NFD decomposes, then we handle diacritics)
      .normalize('NFD')
      // Apply transliteration map for known characters
      // eslint-disable-next-line no-control-regex
      .replace(/[^\u0000-\u007F]/g, (char) => {
        // First check our transliteration map
        if (TRANSLITERATION_MAP[char]) {
          return TRANSLITERATION_MAP[char];
        }
        // Remove combining diacritical marks (accents) that remain after NFD normalization
        if (/[\u0300-\u036f]/.test(char)) {
          return '';
        }
        // Remove other non-ASCII characters (emojis, symbols, CJK, etc.)
        return '-';
      })
      // Replace & with 'and' (handle case where it wasn't caught by transliteration)
      .replace(/&/g, '-and-')
      // Replace any sequence of whitespace or non-word characters with a single dash
      .replace(/[\s\W-]+/g, '-')
      // Remove leading and trailing dashes
      .replace(/^-+|-+$/g, '')
  );
}
