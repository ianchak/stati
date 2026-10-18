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
  });

  it('returns new objects for files with the same text', () => {
    const source = '---\ntitle: Same\n---\nBody';
    const first = parseFrontMatter(source, file);
    const second = parseFrontMatter(source, file);
    expect(second.data).toEqual(first.data);
    expect(second.data).not.toBe(first.data);
  });
});
