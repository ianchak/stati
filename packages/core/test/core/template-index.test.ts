import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  TemplateIndex,
  endTemplateIndexSession,
  getCachedTemplateIndex,
  isTemplateLookupList,
  loadTemplateIndex,
  lookupFolders,
  parseTemplateName,
  relativeTemplateName,
  startTemplateIndexSession,
  templateFolderOf,
  toTemplateFile,
} from '../../src/core/template-index.js';

const srcDir = join('/project', 'site');

describe('parseTemplateName', () => {
  it('parses looked-up names, dropping an .eta suffix', () => {
    expect(parseTemplateName('header', 'layout.eta')).toEqual({ kind: 'lookup', name: 'header' });
    expect(parseTemplateName('partials/header.eta', null)).toEqual({
      kind: 'lookup',
      name: 'partials/header',
    });
    expect(parseTemplateName('partials//./header', null)).toEqual({
      kind: 'lookup',
      name: 'partials/header',
    });
  });

  it('reads a leading / as a path from the source directory', () => {
    expect(parseTemplateName('/partials/header', 'blog/layout.eta')).toEqual({
      kind: 'path',
      path: '/partials/header',
      relative: false,
    });
  });

  it('resolves ./ and ../ against the calling template', () => {
    expect(parseTemplateName('./icon', 'partials/card.eta')).toEqual({
      kind: 'path',
      path: '/partials/icon',
      relative: true,
    });
    expect(parseTemplateName('../icons/arrow', 'partials/cards/card.eta')).toEqual({
      kind: 'path',
      path: '/partials/icons/arrow',
      relative: true,
    });
    expect(parseTemplateName('./base', 'layout.eta')).toEqual({
      kind: 'path',
      path: '/base',
      relative: true,
    });
  });

  it('treats backslashes as separators, as Windows paths written in templates have them', () => {
    expect(parseTemplateName('partials\\header', null)).toEqual({
      kind: 'lookup',
      name: 'partials/header',
    });
    expect(parseTemplateName('..\\icons\\arrow', 'partials\\cards\\card.eta')).toEqual({
      kind: 'path',
      path: '/partials/icons/arrow',
      relative: true,
    });
  });

  it('rejects names outside the source directory', () => {
    for (const [name, caller] of [
      ['../outside', 'layout.eta'],
      ['../../outside', 'partials/card.eta'],
      ['/../outside', null],
      ['partials/../../outside', null],
    ] as const) {
      expect(parseTemplateName(name, caller)).toEqual({
        kind: 'invalid',
        reason: 'resolves outside the source directory',
      });
    }
    expect(parseTemplateName('C:/site/header', null)).toMatchObject({ kind: 'invalid' });
    expect(parseTemplateName('c:\\site\\header', null)).toMatchObject({ kind: 'invalid' });
  });

  it('rejects names that cannot name a template', () => {
    for (const name of ['', '.eta', '/', 'partials/', '.', '..']) {
      expect(parseTemplateName(name, 'layout.eta')).toMatchObject({ kind: 'invalid' });
    }
    for (const name of ['partials/..', 'a/b/../..']) {
      expect(parseTemplateName(name, 'layout.eta')).toEqual({
        kind: 'invalid',
        reason: 'names a folder, not a template',
      });
    }
    expect(parseTemplateName(undefined, null)).toEqual({
      kind: 'invalid',
      reason: 'must be a string, not undefined',
    });
    expect(parseTemplateName(4, null)).toEqual({
      kind: 'invalid',
      reason: 'must be a string, not number 4',
    });
    expect(parseTemplateName({ name: 'x' }, null)).toEqual({
      kind: 'invalid',
      reason: 'must be a string, not an object',
    });
  });

  it('rejects relative names in a template without a file', () => {
    const parsed = parseTemplateName('./card', null);
    expect(parsed.kind).toBe('invalid');
    expect(parsed.kind === 'invalid' && parsed.reason).toContain('built-in Open Graph template');
  });
});

describe('folders and paths', () => {
  it('lists the lookup folders, nearest first', () => {
    expect(lookupFolders('blog/2024')).toEqual(['blog/2024', 'blog', '']);
    expect(lookupFolders('')).toEqual(['']);
  });

  it('finds the folder of a file, with either separator', () => {
    expect(templateFolderOf('blog/post.md')).toBe('blog');
    expect(templateFolderOf('a\\b\\deep.md')).toBe('a/b');
    expect(templateFolderOf('index.md')).toBe('');
    // Pages outside the source directory look names up from the source directory
    expect(templateFolderOf('../elsewhere/page.md')).toBe('');
    expect(templateFolderOf('D:\\other\\page.md')).toBe('');
  });

  it('converts watcher paths to index paths', () => {
    expect(toTemplateFile('/project/site', '/project/site/partials/header.eta')).toBe(
      'partials/header.eta',
    );
    expect(toTemplateFile('C:\\project\\site', 'C:\\project\\site\\a\\b.eta')).toBe('a/b.eta');
    // Drive letters compare without case on Windows
    expect(toTemplateFile('C:\\project\\site', 'c:\\project\\site\\b.eta')).toBe('b.eta');
    expect(toTemplateFile('/project/site', '/project/site/page.md')).toBeNull();
    expect(toTemplateFile('/project/site', '/project/public/x.eta')).toBeNull();
    expect(toTemplateFile('/project/site', '/project/site-other/x.eta')).toBeNull();
  });

  it('writes ./ and ../ names between source-relative folders', () => {
    expect(relativeTemplateName('partials', 'partials/icon')).toBe('./icon');
    expect(relativeTemplateName('blog/2024', 'blog/post')).toBe('../post');
    expect(relativeTemplateName('', 'layout')).toBe('./layout');
    expect(relativeTemplateName('blog', 'docs/guide')).toBe('../docs/guide');
    expect(relativeTemplateName('blog', 'blog')).toBe('../blog');
  });
});

describe('TemplateIndex', () => {
  const index = () =>
    new TemplateIndex(srcDir, [
      'layout.eta',
      'base.eta',
      'partials/header.eta',
      'partials/icon.eta',
      'blog/partials/header.eta',
      'blog/layout.eta',
      '_partials/footer.eta',
      '_components/cards/card.eta',
    ]);

  it('looks names up from the page folder, the nearest match winning', () => {
    const templates = index();
    expect(templates.lookup('partials/header', 'blog/2024')).toBe('blog/partials/header.eta');
    expect(templates.lookup('partials/header', 'docs')).toBe('partials/header.eta');
    expect(templates.lookup('base', 'blog')).toBe('base.eta');
    expect(templates.lookup('missing', 'blog')).toBeNull();
  });

  it('resolves each kind of name and returns the lookup to record', () => {
    const templates = index();
    expect(templates.resolve({ kind: 'lookup', name: 'partials/header' }, 'blog')).toEqual({
      file: 'blog/partials/header.eta',
      lookup: { name: 'partials/header', from: 'blog', file: 'blog/partials/header.eta' },
    });
    expect(
      templates.resolve({ kind: 'path', path: '/partials/header', relative: false }, 'blog'),
    ).toEqual({
      file: 'partials/header.eta',
      lookup: { name: '/partials/header', file: 'partials/header.eta' },
    });
    expect(
      templates.resolve({ kind: 'path', path: '/partials/promo', relative: true }, ''),
    ).toEqual({ file: null, lookup: { name: '/partials/promo', file: null } });
  });

  it('notices when a recorded lookup would resolve differently', () => {
    const templates = index();
    const lookups = [
      { name: 'partials/header', from: 'docs', file: 'partials/header.eta' },
      { name: '/partials/promo', file: null },
    ];
    expect(templates.lookupsChanged(lookups)).toBe(false);

    // A section override for docs pages
    templates.add('docs/partials/header.eta');
    expect(templates.resolveRecorded(lookups[0]!)).toBe('docs/partials/header.eta');
    expect(templates.lookupsChanged(lookups)).toBe(true);
    templates.remove('docs/partials/header.eta');
    expect(templates.lookupsChanged(lookups)).toBe(false);

    // A file that a has() check did not find
    templates.add('partials/promo.eta');
    expect(templates.lookupsChanged(lookups)).toBe(true);
    expect(templates.lookupsChanged(undefined)).toBe(false);
  });

  it('ignores files that are not templates and reports whether it changed', () => {
    const templates = index();
    expect(templates.add('notes.md')).toBe(false);
    expect(templates.add('layout.eta')).toBe(false);
    expect(templates.add('new.eta')).toBe(true);
    expect(templates.remove('missing.eta')).toBe(false);
    expect(templates.remove('new.eta')).toBe(true);
    expect(templates.size).toBe(8);
  });

  it('suggests templates with the same base name first, written the way the name was', () => {
    const templates = index();
    expect(templates.suggest({ kind: 'lookup', name: 'footer' }, '', null)).toEqual([
      '_partials/footer',
    ]);
    expect(templates.suggest({ kind: 'lookup', name: 'partials/hedaer' }, 'blog', null)).toEqual([
      'partials/header',
    ]);
    expect(
      templates.suggest(
        { kind: 'path', path: '/partials/icn', relative: true },
        '',
        'partials/card.eta',
      ),
    ).toEqual(['./icon']);
    expect(
      templates.suggest({ kind: 'path', path: '/partial/header', relative: false }, '', null),
    ).toEqual(['/partials/header', '/blog/partials/header']);
  });
});

describe('TemplateIndex.resolvePageLayout', () => {
  it('discovers layout.eta from the page folder up and records the lookups', () => {
    const templates = new TemplateIndex(srcDir, ['layout.eta', 'blog/layout.eta']);
    expect(templates.resolvePageLayout('blog/post.md', undefined, false)).toEqual({
      file: 'blog/layout.eta',
      lookups: [{ name: 'layout', from: 'blog', file: 'blog/layout.eta' }],
    });
  });

  it('prefers index.eta on index pages, within the nearest folder that has either', () => {
    const templates = new TemplateIndex(srcDir, ['index.eta', 'layout.eta', 'blog/layout.eta']);
    expect(templates.resolvePageLayout('index.md', undefined, true).file).toBe('index.eta');
    expect(templates.resolvePageLayout('blog/index.md', undefined, true)).toEqual({
      file: 'blog/layout.eta',
      lookups: [
        { name: 'layout', from: 'blog', file: 'blog/layout.eta' },
        { name: 'index', from: 'blog', file: 'index.eta' },
      ],
    });
  });

  it('uses front matter layout by the name lookup, so a section file wins', () => {
    const templates = new TemplateIndex(srcDir, ['layout.eta', 'posts/layout.eta']);
    expect(templates.resolvePageLayout('posts/index.md', 'layout', true)).toEqual({
      file: 'posts/layout.eta',
      lookups: [{ name: 'layout', from: 'posts', file: 'posts/layout.eta' }],
    });
    expect(templates.resolvePageLayout('posts/index.md', '/layout', true).file).toBe('layout.eta');
    expect(templates.resolvePageLayout('posts/index.md', './layout', true).file).toBe(
      'posts/layout.eta',
    );
  });

  it('reads a numeric front matter layout as a name', () => {
    const templates = new TemplateIndex(srcDir, ['layout.eta', '404.eta']);
    expect(templates.resolvePageLayout('404.md', 404, false).file).toBe('404.eta');
  });

  it('falls back to discovery when the front matter layout resolves to nothing', () => {
    const templates = new TemplateIndex(srcDir, ['layout.eta', 'layouts/post.eta']);
    expect(templates.resolvePageLayout('blog/post.md', 'post', false)).toEqual({
      file: 'layout.eta',
      lookups: [
        { name: 'post', from: 'blog', file: null },
        { name: 'layout', from: 'blog', file: 'layout.eta' },
      ],
      unresolvedFrontMatter: {
        value: 'post',
        problem: 'names no template',
        suggestions: ['layouts/post'],
      },
    });
    expect(templates.resolvePageLayout('post.md', true, false).unresolvedFrontMatter).toEqual({
      value: true,
      problem: 'must be a string, not boolean true',
      suggestions: [],
    });
  });
});

describe('isTemplateLookupList', () => {
  it('accepts recorded lookups and rejects anything else', () => {
    expect(isTemplateLookupList([])).toBe(true);
    expect(
      isTemplateLookupList([
        { name: 'partials/header', from: '', file: 'partials/header.eta' },
        { name: '/x', file: null },
      ]),
    ).toBe(true);
    expect(isTemplateLookupList([{ name: 'x' }])).toBe(false);
    expect(isTemplateLookupList([{ name: 'x', from: 1, file: null }])).toBe(false);
    expect(isTemplateLookupList([null])).toBe(false);
    expect(isTemplateLookupList('x')).toBe(false);
  });
});

describe('loading the index', () => {
  let root: string | undefined;

  afterEach(async () => {
    if (root) {
      endTemplateIndexSession(root);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('globs every .eta file once, without dotfiles or node_modules', async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-template-index-'));
    for (const file of [
      'layout.eta',
      'partials/header.eta',
      '_partials/old.eta',
      '.drafts/hidden.eta',
      'node_modules/pkg/x.eta',
      'page.md',
    ]) {
      await mkdir(join(root, file, '..'), { recursive: true });
      await writeFile(join(root, file), '');
    }

    const index = await TemplateIndex.load(root);
    expect([...index.files()]).toEqual(['_partials/old.eta', 'layout.eta', 'partials/header.eta']);
  });

  it('reads the source directory for every build outside a dev server session', async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-template-index-'));
    const first = await loadTemplateIndex(root);
    await writeFile(join(root, 'layout.eta'), '');

    const second = await loadTemplateIndex(root);
    expect(second).not.toBe(first);
    expect(second.has('layout.eta')).toBe(true);
    expect(getCachedTemplateIndex(root)).toBeNull();
  });

  it('reuses one index during a session for its source directory only', async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-template-index-'));
    startTemplateIndexSession(root);
    expect(getCachedTemplateIndex(root)).toBeNull();

    const first = await loadTemplateIndex(root);
    expect(await loadTemplateIndex(join(root, '.'))).toBe(first);
    expect(getCachedTemplateIndex(root)).toBe(first);
    expect(await loadTemplateIndex(join(root, 'other'))).not.toBe(first);
    expect(getCachedTemplateIndex(join(root, 'other'))).toBeNull();

    // Ending another directory's session leaves this one
    endTemplateIndexSession(join(root, 'other'));
    expect(getCachedTemplateIndex(root)).toBe(first);

    endTemplateIndexSession(root);
    expect(getCachedTemplateIndex(root)).toBeNull();
    expect(await loadTemplateIndex(root)).not.toBe(first);
  });

  it('returns the index when the session ends while it loads', async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-template-index-'));
    await writeFile(join(root, 'layout.eta'), '');
    startTemplateIndexSession(root);

    const loading = loadTemplateIndex(root);
    endTemplateIndexSession(root);

    expect((await loading).files()).toEqual(['layout.eta']);
    expect(getCachedTemplateIndex(root)).toBeNull();
  });
});
