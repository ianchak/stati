import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORDS_PER_MINUTE,
  computeReadingTime,
  computeTextStats,
  countWords,
  fillTextStats,
  resolveWordsPerMinute,
  validateReadingTimeConfig,
} from '../../src/core/reading-time.js';
import { ConfigValidationError } from '../../src/config/errors.js';
import type { PageModel, StatiConfig } from '../../src/types/index.js';

const config: StatiConfig = { site: { title: 'Test', baseUrl: 'https://example.com' } };

function makePage(content: string, extra: Partial<PageModel> = {}): PageModel {
  return { slug: '/p', url: '/p', sourcePath: '/site/p.md', frontMatter: {}, content, ...extra };
}

describe('countWords', () => {
  it('splits words on any whitespace', () => {
    expect(countWords('one two\tthree\nfour\r\n\r\nfive')).toBe(5);
  });

  it('counts the same with Windows line endings', () => {
    const markdown = ['one two', '', '```', 'not counted', '```', '', 'three'].join('\r\n');

    expect(countWords(markdown)).toBe(3);
  });

  it('counts nothing for an empty or blank body', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(' \n\t ')).toBe(0);
  });

  it('leaves out fenced code blocks, whatever the fence', () => {
    const markdown = [
      'Before the code.',
      '',
      '```ts',
      'const lots = of.words(that, should, not, count);',
      '```',
      '',
      '~~~',
      'tilde fenced code is skipped too',
      '~~~',
      '',
      'After the code.',
    ].join('\n');

    expect(countWords(markdown)).toBe(6);
  });

  it('leaves out HTML tags but keeps the words between them', () => {
    expect(
      countWords('<div class="wide other"><p>Hello <strong>big</strong> world</p></div>'),
    ).toBe(3);
  });

  it('counts the text of links and not their URLs, and skips images', () => {
    expect(countWords('Read [the full guide](https://example.com/a/very/long/path) now')).toBe(5);
    expect(countWords('![A diagram of three boxes](/img/boxes.png)')).toBe(0);
  });

  it('does not count Markdown syntax as words', () => {
    const markdown = '# Title\n\n- first\n- second\n\n> quoted words\n\n---\n\n1. one\n2. two';

    expect(countWords(markdown)).toBe(7);
  });

  it('counts inline code', () => {
    expect(countWords('Call `stati.include()` to include a template')).toBe(6);
  });

  it('counts words in any alphabet, numbers included', () => {
    expect(countWords('Привет мир, 2026 évènement naïve')).toBe(5);
  });

  it('counts each Chinese or Japanese character as a word', () => {
    expect(countWords('你好世界')).toBe(4);
    expect(countWords('こんにちはカタカナ')).toBe(9);
  });

  it('counts mixed text: characters of unspaced scripts and words between spaces', () => {
    expect(countWords('Stati 是一个静态站点生成器 for everyone')).toBe(1 + 10 + 2);
  });

  it('splits Korean on spaces like other alphabets', () => {
    expect(countWords('안녕하세요 세계')).toBe(2);
  });
});

describe('computeReadingTime', () => {
  it('is at least one minute, also for an empty page', () => {
    expect(computeReadingTime(0, 230)).toBe(1);
    expect(computeReadingTime(10, 230)).toBe(1);
  });

  it('rounds to whole minutes', () => {
    expect(computeReadingTime(344, 230)).toBe(1);
    expect(computeReadingTime(345, 230)).toBe(2);
    expect(computeReadingTime(2300, 230)).toBe(10);
  });

  it('follows the reading speed', () => {
    expect(computeReadingTime(1000, 100)).toBe(10);
    expect(computeReadingTime(1000, 500)).toBe(2);
  });
});

describe('computeTextStats', () => {
  it('returns the word count and the minutes for it', () => {
    const body = Array.from({ length: 460 }, (_, i) => `word${i}`).join(' ');

    expect(computeTextStats(body, 230)).toEqual({ wordCount: 460, readingTime: 2 });
  });
});

describe('resolveWordsPerMinute', () => {
  it('defaults to 230', () => {
    expect(DEFAULT_WORDS_PER_MINUTE).toBe(230);
    expect(resolveWordsPerMinute(config)).toBe(230);
    expect(resolveWordsPerMinute({ ...config, readingTime: {} })).toBe(230);
  });

  it('falls back to the default for a speed that config validation would reject', () => {
    for (const wordsPerMinute of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(resolveWordsPerMinute({ ...config, readingTime: { wordsPerMinute } })).toBe(230);
    }
  });

  it('reads the configured speed', () => {
    expect(resolveWordsPerMinute({ ...config, readingTime: { wordsPerMinute: 180 } })).toBe(180);
  });
});

describe('validateReadingTimeConfig', () => {
  it('accepts no block, an empty block and a positive speed', () => {
    expect(() => validateReadingTimeConfig(undefined)).not.toThrow();
    expect(() => validateReadingTimeConfig({})).not.toThrow();
    expect(() => validateReadingTimeConfig({ wordsPerMinute: undefined })).not.toThrow();
    expect(() => validateReadingTimeConfig({ wordsPerMinute: 150.5 })).not.toThrow();
  });

  it.each([null, 5, 'fast', [230], true])('rejects %j as the block', (value) => {
    expect(() => validateReadingTimeConfig(value)).toThrow(ConfigValidationError);
    expect(() => validateReadingTimeConfig(value)).toThrow(/readingTime must be an object/);
  });

  it('names an unknown option', () => {
    expect(() => validateReadingTimeConfig({ speed: 200 })).toThrow(
      'Unknown option readingTime.speed. Allowed options: wordsPerMinute.',
    );
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, '230', null])(
    'rejects %j as the speed',
    (value) => {
      expect(() => validateReadingTimeConfig({ wordsPerMinute: value })).toThrow(
        ConfigValidationError,
      );
      expect(() => validateReadingTimeConfig({ wordsPerMinute: value })).toThrow(
        /readingTime\.wordsPerMinute must be a number above 0/,
      );
    },
  );

  it('reports a value that cannot be serialized', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => validateReadingTimeConfig({ wordsPerMinute: circular })).toThrow(
      /must be a number above 0 \(got \[object Object\]\)/,
    );
  });
});

describe('fillTextStats', () => {
  it('gives pages without values theirs, from the body', () => {
    const page = makePage('one two three');

    fillTextStats([page], config);

    expect(page.wordCount).toBe(3);
    expect(page.readingTime).toBe(1);
  });

  it('keeps the values a page already has', () => {
    const page = makePage('one two three', { wordCount: 900, readingTime: 7 });

    fillTextStats([page], config);

    expect(page.wordCount).toBe(900);
    expect(page.readingTime).toBe(7);
  });

  it('works out the minutes from a word count a hook set', () => {
    const page = makePage('one two three', { wordCount: 460 });

    fillTextStats([page], { ...config, readingTime: { wordsPerMinute: 230 } });

    expect(page.wordCount).toBe(460);
    expect(page.readingTime).toBe(2);
  });
});
