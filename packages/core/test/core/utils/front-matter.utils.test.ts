import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import { FrontMatterError, parseFrontMatter } from '../../../src/core/utils/front-matter.utils.js';

const file = join(process.cwd(), 'site', 'post.md');

/** The error parseFrontMatter throws for a source */
function errorFor(source: string): FrontMatterError {
  try {
    parseFrontMatter(source, file);
  } catch (error) {
    expect(error).toBeInstanceOf(FrontMatterError);
    return error as FrontMatterError;
  }
  throw new Error('Expected parseFrontMatter to throw');
}

describe('parseFrontMatter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('splits YAML front matter from the Markdown after it', () => {
    expect(parseFrontMatter('---\ntitle: Home\ntags: [a, b]\n---\n# Welcome\n', file)).toEqual({
      data: { title: 'Home', tags: ['a', 'b'] },
      content: '# Welcome\n',
    });
  });

  it('returns a file without front matter unchanged', () => {
    expect(parseFrontMatter('# Title\n\nBody', file)).toEqual({
      data: {},
      content: '# Title\n\nBody',
    });
    expect(parseFrontMatter('', file)).toEqual({ data: {}, content: '' });
    // Front matter starts on the first line only
    expect(parseFrontMatter('\n---\ntitle: x\n---\n', file).data).toEqual({});
  });

  it('reads ---- and longer as a horizontal rule, not front matter', () => {
    expect(parseFrontMatter('----\ntitle: x\n----\nBody', file)).toEqual({
      data: {},
      content: '----\ntitle: x\n----\nBody',
    });
  });

  it('drops a byte order mark and reads CRLF line endings', () => {
    expect(parseFrontMatter('﻿---\r\ntitle: CRLF\r\n---\r\nBody\r\nMore', file)).toEqual({
      data: { title: 'CRLF' },
      content: 'Body\r\nMore',
    });
    expect(parseFrontMatter('﻿# No front matter', file).content).toBe('# No front matter');
  });

  it('ends the front matter at the first line that starts with ---', () => {
    expect(parseFrontMatter('---\ntitle: x\n---\nBody\n---\nMore', file).content).toBe(
      'Body\n---\nMore',
    );
    // The rest of the closing line stays in the Markdown
    expect(parseFrontMatter('---\ntitle: x\n---   \nBody', file).content).toBe('   \nBody');
    expect(parseFrontMatter('---\ntitle: x\n-----\nBody', file).content).toBe('--\nBody');
    // One line break after the closing line is dropped, not a blank line
    expect(parseFrontMatter('---\ntitle: x\n---\n\nBody', file).content).toBe('\nBody');
  });

  it('reads empty and comment-only front matter as no values', () => {
    expect(parseFrontMatter('---\n---\nBody', file)).toEqual({ data: {}, content: 'Body' });
    expect(parseFrontMatter('---\r\n---\r\nBody', file)).toEqual({ data: {}, content: 'Body' });
    expect(parseFrontMatter('---\n# a comment\n  # another\n\n---\nBody', file)).toEqual({
      data: {},
      content: 'Body',
    });
    expect(parseFrontMatter('---', file)).toEqual({ data: {}, content: '' });
  });

  it('reads a file without a closing line as front matter only', () => {
    expect(parseFrontMatter('---\ntitle: Only front matter\n', file)).toEqual({
      data: { title: 'Only front matter' },
      content: '',
    });
  });

  it('reports a missing closing line when the rest of the file is not front matter', () => {
    const error = errorFor('---\n\nA horizontal rule, then text.');
    expect(error.message).toBe(
      'Invalid front matter in site/post.md: the file starts with a --- line, which starts front matter, and no later --- line ends it. Add the closing --- line, or start the file with *** for a horizontal rule.',
    );
    expect(error.filePath).toBe(file);
    expect(error.line).toBe(1);
  });

  it('accepts a yaml, yml or json language after the opening ---', () => {
    for (const language of ['yaml', 'yml', 'YAML', ' yaml ']) {
      expect(parseFrontMatter(`---${language}\ntitle: tagged\n---\nBody`, file)).toEqual({
        data: { title: 'tagged' },
        content: 'Body',
      });
    }
    expect(parseFrontMatter('---json\n{ "title": "json", "weight": 2 }\n---\nBody', file)).toEqual({
      data: { title: 'json', weight: 2 },
      content: 'Body',
    });
  });

  it('rejects front matter in other languages instead of running it', () => {
    const error = errorFor('---js\n{ title: "x" }\n---\nBody');
    expect(error.message).toBe(
      'Invalid front matter in site/post.md at line 1: Stati reads front matter in YAML, not js. Remove "js" after the opening ---.',
    );
    expect(error.line).toBe(1);
  });

  it('reads unquoted dates as Date objects and quoted ones as text', () => {
    const { data } = parseFrontMatter(
      '---\ndate: 2024-01-15\nat: 2024-01-15T10:30:00+02:00\nquoted: "2024-01-15"\n---\n',
      file,
    );
    expect(data).toEqual({
      date: new Date('2024-01-15T00:00:00.000Z'),
      at: new Date('2024-01-15T08:30:00.000Z'),
      quoted: '2024-01-15',
    });
  });

  it("reads an unquoted date that doesn't exist as text, not as a later date", () => {
    const { data } = parseFrontMatter(
      [
        '---',
        'date: 2025-02-30',
        'month: 2025-13-01',
        'notLeap: 2025-02-29',
        'day: 2025-04-31T10:00:00Z',
        'hour: 2025-01-01 25:00:00',
        'minute: 2025-01-01T10:60:00Z',
        'leap: 2024-02-29',
        'endOfDay: 2025-01-01T24:00:00Z',
        'oneDigit: 2025-2-3 10:00:00',
        '---',
      ].join('\n'),
      file,
    );
    expect(data).toEqual({
      date: '2025-02-30',
      month: '2025-13-01',
      notLeap: '2025-02-29',
      day: '2025-04-31T10:00:00Z',
      hour: '2025-01-01 25:00:00',
      minute: '2025-01-01T10:60:00Z',
      leap: new Date('2024-02-29T00:00:00.000Z'),
      endOfDay: new Date('2025-01-02T00:00:00.000Z'),
      oneDigit: new Date('2025-02-03T10:00:00.000Z'),
    });
  });

  it("reports a !!timestamp tag on a date that doesn't exist with its line", () => {
    const error = errorFor('---\ntitle: Post\ndate: !!timestamp 2025-02-30\n---\n');
    expect(error.line).toBe(3);
    expect(error.message).toContain('Invalid front matter in site/post.md at line 3');
  });

  it('reads values by YAML 1.2: times and zero-padded numbers are not base 60 or octal', () => {
    const { data } = parseFrontMatter('---\ntime: 10:30\nmode: 0755\nbig: 1_000\n---\n', file);
    expect(data).toEqual({ time: '10:30', mode: 755, big: '1_000' });
  });

  it('reports invalid YAML with its line and column in the file', () => {
    const error = errorFor('---\ntitle: Post\ntags: [a, b\n---\nBody');
    expect(error.message).toMatch(
      /^Invalid front matter in site\/post\.md at line \d+, column \d+: .+\.$/,
    );
    expect(error.line).toBeGreaterThanOrEqual(3);
    expect(error.filePath).toBe(file);

    const duplicate = errorFor('---\ntitle: One\ntitle: Two\n---\n');
    expect(duplicate.message).toBe(
      'Invalid front matter in site/post.md at line 3, column 1: duplicated mapping key.',
    );
    expect(duplicate.line).toBe(3);
    expect(duplicate.column).toBe(1);
  });

  it('suggests quoting a value that contains a colon', () => {
    const error = errorFor('---\ntitle: Stati: a static site generator\n---\n');
    expect(error.message).toBe(
      'Invalid front matter in site/post.md at line 2, column 13: bad indentation of a mapping entry. Quote a value that contains a colon, such as title: "Stati: a static site generator".',
    );
    expect(error.line).toBe(2);
  });

  it('rejects front matter that is not key: value lines', () => {
    expect(errorFor('---\n- one\n- two\n---\n').message).toBe(
      'Invalid front matter in site/post.md: front matter must be "key: value" lines, such as "title: My page", not a list.',
    );
    expect(errorFor('---\njust text\n---\n').message).toBe(
      'Invalid front matter in site/post.md: front matter must be "key: value" lines, such as "title: My page", not the text "just text".',
    );
    expect(errorFor('---json\n[1, 2]\n---\n').message).toContain('not a list.');
    expect(errorFor('---\n42\n---\n').message).toContain('not the number 42.');
    expect(errorFor('---\ntrue\n---\n').message).toContain('not the boolean true.');
    expect(errorFor('---\n2024-01-15\n---\n').message).toContain('not a date.');
    expect(errorFor('---\n!!binary aGVsbG8=\n---\n').message).toContain('not binary data.');
  });

  it('reports invalid JSON front matter with the file', () => {
    const error = errorFor('---json\n{ "title": "json", }\n---\nBody');
    expect(error.message).toMatch(/^Invalid front matter in site\/post\.md: .*JSON.*\.$/);
    expect(error.filePath).toBe(file);
  });

  it('reports an error of the YAML parser itself with the file', async () => {
    vi.resetModules();
    vi.doMock('js-yaml', async (importOriginal) => ({
      ...(await importOriginal<typeof import('js-yaml')>()),
      load: () => {
        throw new RangeError('Maximum call stack size exceeded');
      },
    }));
    try {
      const { parseFrontMatter: parse, FrontMatterError: Thrown } =
        await import('../../../src/core/utils/front-matter.utils.js');
      expect(() => parse('---\ntitle: x\n---\n', file)).toThrow(Thrown);
      expect(() => parse('---\ntitle: x\n---\n', file)).toThrow(
        'Invalid front matter in site/post.md: Maximum call stack size exceeded.',
      );
    } finally {
      vi.doUnmock('js-yaml');
      vi.resetModules();
    }
  });

  it('returns new objects for files with the same text', () => {
    const source = '---\ntitle: Same\n---\nBody';
    const first = parseFrontMatter(source, file);
    const second = parseFrontMatter(source, file);
    expect(second.data).toEqual(first.data);
    expect(second.data).not.toBe(first.data);
  });
});

describe('parseFrontMatter text fields', () => {
  /** Front matter as the file's YAML parses it, and the warnings it caused */
  function parse(yaml: string, language = '') {
    const warnings: string[] = [];
    const { data } = parseFrontMatter(`---${language}\n${yaml}\n---\n`, file, (message) =>
      warnings.push(message),
    );
    return { data, warnings };
  }

  it('reads numbers and booleans as the text that was written', () => {
    const { data } = parse(
      'title: 1984\ndescription: 1.10\nseo:\n  title: 007\n  description: True',
    );
    expect(data).toEqual({
      title: '1984',
      description: '1.10',
      seo: { title: '007', description: 'True' },
    });
  });

  it('reads other number notations as written', () => {
    const { data } = parse(
      'title: 0x1F\ndescription: 1e3\ntags: [+5, 3.10, 123456789012345678901]',
    );
    expect(data).toEqual({
      title: '0x1F',
      description: '1e3',
      tags: ['+5', '3.10', '123456789012345678901'],
    });
  });

  it('reads an unquoted date as written, with or without a time or an offset', () => {
    const { data } = parse(
      'title: 2024-01-01\ndescription: 2024-01-01T10:30:00+02:00\ntags: [2024-05-06]',
    );
    expect(data).toEqual({
      title: '2024-01-01',
      description: '2024-01-01T10:30:00+02:00',
      tags: ['2024-05-06'],
    });
  });

  it('leaves a trailing comment out of the text', () => {
    expect(parse('title: 1984 # the year').data.title).toBe('1984');
  });

  it('reads the entries of tags and seo.keywords as text', () => {
    const { data } = parse('tags: [2024, news, true]\nseo:\n  keywords: [1, two]');
    expect(data).toEqual({ tags: ['2024', 'news', 'true'], seo: { keywords: ['1', 'two'] } });
  });

  it('reads a single seo.keywords number as text', () => {
    expect(parse('seo:\n  keywords: 2024').data).toEqual({ seo: { keywords: '2024' } });
  });

  it('drops null entries from lists and warns with the field and the file', () => {
    const { data, warnings } = parse('tags: [~, a, null]\nseo:\n  keywords: [~]');
    expect(data).toEqual({ tags: ['a'], seo: { keywords: [] } });
    const where = 'of site/post.md';
    expect(warnings).toEqual([
      `Ignoring empty entry in "tags" ${where}`,
      `Ignoring empty entry in "tags" ${where}`,
      `Ignoring empty entry in "seo.keywords" ${where}`,
    ]);
  });

  it('drops null entries when nobody listens for warnings', () => {
    const { data } = parseFrontMatter('---\ntags: [~, a]\n---\n', file);
    expect(data).toEqual({ tags: ['a'] });
    expect(parseFrontMatter('---\ntags: a, b\n---\n', file).data).toEqual({ tags: ['a, b'] });
  });

  it('falls back to the parsed value when the text cannot be read again', () => {
    expect(parse('title: !!int 5\ntags: [!!float 2.50]').data).toEqual({
      title: '5',
      tags: ['2.5'],
    });
  });

  it('writes a date as 2024-01-01 or ISO 8601 when the text cannot be read again', () => {
    expect(
      parse('title: !!timestamp 2024-01-01\ndescription: !!timestamp 2024-01-01T10:30:00Z').data,
    ).toEqual({
      title: '2024-01-01',
      description: '2024-01-01T10:30:00.000Z',
    });
  });

  it('reads JSON front matter numbers as text', () => {
    const { data } = parse(
      '{"title": 1984, "tags": [2024, null, "a"], "seo": {"title": true}}',
      'json',
    );
    expect(data).toEqual({ title: '1984', tags: ['2024', 'a'], seo: { title: 'true' } });
  });

  it('leaves text, null, other fields and other shapes as they are', () => {
    const yaml = 'title: Home\ndescription:\norder: 5\ndraft: true\ntags: {a: 1}\nseo: just text';
    expect(parse(yaml).data).toEqual({
      title: 'Home',
      description: null,
      order: 5,
      draft: true,
      tags: { a: 1 },
      seo: 'just text',
    });
  });

  it('reads a single tags value as a list of one, as written', () => {
    expect(parse('tags: news').data).toEqual({ tags: ['news'] });
    expect(parse('tags: 2024').data).toEqual({ tags: ['2024'] });
    expect(parse('tags: 1.10').data).toEqual({ tags: ['1.10'] });
    expect(parse('tags: true').data).toEqual({ tags: ['true'] });
    expect(parse('tags: 2024-05-06').data).toEqual({ tags: ['2024-05-06'] });
  });

  it('warns about a single tag that looks like a list, and reads it as one tag', () => {
    const { data, warnings } = parse('tags: news, css');
    expect(data).toEqual({ tags: ['news, css'] });
    expect(warnings).toEqual([
      'Reading "tags" of site/post.md as one tag, "news, css". Write a list for more than one: tags: [news, css]',
    ]);
    expect(parse('tags: news').warnings).toEqual([]);
    expect(parse('tags: [news, css]').warnings).toEqual([]);
  });

  it('reads a single JSON tags value as a list of one', () => {
    expect(parse('{"tags": "news"}', 'json').data).toEqual({ tags: ['news'] });
    expect(parse('{"tags": 2024}', 'json').data).toEqual({ tags: ['2024'] });
  });

  it('reads a blank tags value as no tags, and leaves one without a value alone', () => {
    expect(parse("tags: ''").data).toEqual({ tags: [] });
    expect(parse("tags: '  '").data).toEqual({ tags: [] });
    expect(parse('tags:').data).toEqual({ tags: null });
  });

  it('leaves fields the front matter lacks alone', () => {
    expect(parse('order: 1\nseo:\n  noindex: true').data).toEqual({
      order: 1,
      seo: { noindex: true },
    });
  });
});
