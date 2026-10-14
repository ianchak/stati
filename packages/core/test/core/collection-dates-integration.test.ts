import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../src/core/build.js';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import type { Logger, StatiConfig } from '../../src/types/index.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

describe('collection dates integration', () => {
  let projectDir: string;
  const logger: Logger = {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };

  const writePost = (name: string, frontMatter: string) =>
    writeFile(join(projectDir, 'site', 'blog', `${name}.md`), `---\n${frontMatter}\n---\n# Post`);

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'stati-collection-dates-'));
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    setEnv('production');
    const config: StatiConfig = {
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Dates Test', baseUrl: 'https://example.com' },
    };
    vi.mocked(loadConfig).mockImplementation(async () => config);
    await mkdir(join(projectDir, 'site', 'blog'), { recursive: true });
    await mkdir(join(projectDir, 'public'));
    await writeFile(
      join(projectDir, 'site', 'layout.eta'),
      '<!DOCTYPE html><html><head><title><%= stati.page.title %></title></head><body>' +
        '<% if (stati.collection) { %><ol id="recent"><% stati.collection.recentPages.forEach((post) => { %>' +
        '<li><%= post.frontMatter.title %></li><% }) %></ol><% } %></body></html>',
    );
    await writeFile(join(projectDir, 'site', 'index.md'), '---\ntitle: Home\n---\n# Home');
    await writeFile(join(projectDir, 'site', 'blog', 'index.md'), '---\ntitle: Blog\n---\n# Blog');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setEnv('development');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('orders recentPages by quoted, unquoted and date: front matter', async () => {
    await writePost('a', 'title: A\npublishedAt: 2026-01-01');
    await writePost('z', "title: Z\ndate: '2026-06-01'");
    await writePost('m', "title: M\npublishedAt: '2026-03-01'");
    await writePost('b', 'title: B\ndate: 2026-09-01');
    await writePost('undated', 'title: Aardvark');

    await build({ logger });

    const html = await readFile(join(projectDir, 'dist', 'blog.html'), 'utf-8');
    const titles = [...html.matchAll(/<li>([^<]+)<\/li>/g)].map((match) => match[1]);

    expect(titles).toEqual(['B', 'Z', 'M', 'A', 'Aardvark']);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
