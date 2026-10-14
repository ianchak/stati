import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../src/core/build.js';
import { loadConfig } from '../../src/config/loader.js';
import { loadCacheManifest } from '../../src/core/isg/index.js';
import { setEnv } from '../../src/env.js';
import type { Logger, StatiConfig } from '../../src/types/index.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

describe('nested collection index cache integration', () => {
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
  const runBuild = () => build({ logger });
  const readBlog = () => readFile(join(projectDir, 'dist', 'blog.html'), 'utf-8');
  const writeBlogIndexLayout = (text: string) =>
    writeFile(
      join(projectDir, 'site', 'blog', 'index.eta'),
      `<!DOCTYPE html><html><body><h1>${text}</h1><%~ stati.content %></body></html>`,
    );

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'stati-nested-index-'));
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    setEnv('production');
    const config: StatiConfig = {
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Nested Index Test', baseUrl: 'https://example.com' },
      isg: { enabled: true, ttlSeconds: 3600 },
    };
    vi.mocked(loadConfig).mockImplementation(async () => config);
    await mkdir(join(projectDir, 'site', 'blog'), { recursive: true });
    await mkdir(join(projectDir, 'public'));
    await writeFile(
      join(projectDir, 'site', 'layout.eta'),
      '<!DOCTYPE html><html><body><%~ stati.content %></body></html>',
    );
    await writeFile(join(projectDir, 'site', 'index.md'), '---\ntitle: Home\n---\n# Home');
    await writeFile(join(projectDir, 'site', 'blog', 'index.md'), '---\ntitle: Blog\n---\n# Blog');
    await writeFile(join(projectDir, 'site', 'blog', 'post.md'), '---\ntitle: Post\n---\n# Post');
    await writeBlogIndexLayout('OLD-INDEX');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setEnv('development');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('records the rendered index.eta as the dependency of a nested index page', async () => {
    await runBuild();
    expect(await readBlog()).toContain('OLD-INDEX');

    const manifest = await loadCacheManifest(join(projectDir, '.stati'));
    const deps = manifest!.entries['/blog.html']!.deps;
    expect(deps.some((dep) => dep.endsWith('/site/blog/index.eta'))).toBe(true);
    expect(deps.some((dep) => dep.endsWith('/site/layout.eta'))).toBe(false);
  });

  it('rebuilds only the nested index page when its index.eta changes', async () => {
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    await writeBlogIndexLayout('NEW-INDEX');

    expect(await runBuild()).toMatchObject({ cacheHits: 2, cacheMisses: 1 });
    expect(await readBlog()).toContain('NEW-INDEX');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
