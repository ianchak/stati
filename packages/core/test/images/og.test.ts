import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { inlineLocalImages } from '../../src/images/og.js';

describe('inlineLocalImages', () => {
  let root: string;
  let dirs: { staticDir: string; baseDir: string; srcDir: string };
  const posix = (path: string) => path.replace(/\\/g, '/');

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-og-inline-'));
    dirs = {
      staticDir: join(root, 'public'),
      srcDir: join(root, 'site'),
      baseDir: join(root, 'site', 'blog'),
    };
    await mkdir(join(dirs.staticDir, 'images'), { recursive: true });
    await mkdir(dirs.baseDir, { recursive: true });
    await writeFile(join(dirs.staticDir, 'images', 'logo.svg'), '<svg/>');
    await writeFile(join(dirs.baseDir, 'mark.png'), Buffer.from([1, 2, 3]));
    await writeFile(join(root, 'secret.png'), Buffer.from([9]));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('inlines static images by root-relative path and template images by relative path', async () => {
    const result = await inlineLocalImages(
      `<img src="/images/logo.svg" width="40"><img alt="Mark" src='./mark.png'>`,
      dirs,
    );

    const svg = Buffer.from('<svg/>').toString('base64');
    expect(result.html).toBe(
      `<img src="data:image/svg+xml;base64,${svg}" width="40"><img alt="Mark" src="data:image/png;base64,AQID">`,
    );
    expect(result.files).toEqual([
      posix(join(dirs.staticDir, 'images', 'logo.svg')),
      posix(join(dirs.baseDir, 'mark.png')),
    ]);
  });

  it('tracks a missing image so the page rebuilds once it exists', async () => {
    const html = '<img src="/images/later.png">';
    expect(await inlineLocalImages(html, dirs)).toEqual({
      html,
      files: [posix(join(dirs.staticDir, 'images', 'later.png'))],
    });
  });

  it('leaves remote, data, unsupported and malformed sources and paths outside the project', async () => {
    const html = [
      '<img src="https://example.com/a.png">',
      '<img src="data:image/png;base64,AA">',
      '<img src="/images/doc.pdf">',
      '<img src="/images/%E0%A4%A.png">',
      '<img src="../../secret.png">',
      '<img src="/../secret.png">',
    ].join('');
    expect(await inlineLocalImages(html, dirs)).toEqual({ html, files: [] });
  });

  it('takes linear time on <img tags that never close', async () => {
    const started = performance.now();
    await inlineLocalImages('<img '.repeat(50_000), dirs);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
