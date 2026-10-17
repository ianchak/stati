import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../src/core/build.js';
import { loadConfig } from '../../src/config/loader.js';
import { loadCacheManifest, saveCacheManifest } from '../../src/core/isg/index.js';
import { setEnv } from '../../src/env.js';
import type { Logger, StatiConfig } from '../../src/types/index.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

describe('build cache integration', () => {
  let projectDir: string;
  let config: StatiConfig;
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
  const readHome = () => readFile(join(projectDir, 'dist', 'index.html'), 'utf-8');

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'stati-build-cache-'));
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    setEnv('production');
    config = {
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Cache Test', baseUrl: 'https://example.com' },
      isg: { enabled: true, ttlSeconds: 3600 },
      typescript: {
        enabled: true,
        srcDir: 'src',
        outDir: '_assets',
        hash: true,
        bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
      },
      sitemap: { enabled: true },
      robots: { enabled: true },
    };
    vi.mocked(loadConfig).mockImplementation(async () => config);
    await mkdir(join(projectDir, 'site', 'docs'), { recursive: true });
    await mkdir(join(projectDir, 'src'));
    await mkdir(join(projectDir, 'public'));
    await writeFile(
      join(projectDir, 'site', 'layout.eta'),
      '<!DOCTYPE html><html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>',
    );
    await writeFile(join(projectDir, 'site', 'index.md'), '---\ntitle: Home\n---\n# Welcome');
    await writeFile(join(projectDir, 'site', 'about.md'), '---\ntitle: About\n---\n# About');
    await writeFile(join(projectDir, 'site', 'docs', 'index.md'), '---\ntitle: Docs\n---\n# Docs');
    await writeFile(join(projectDir, 'src', 'main.ts'), 'console.log("first bundle");');
    await writeFile(join(projectDir, 'public', 'styles.css'), 'body { color: black; }');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setEnv('development');
    await rm(projectDir, { recursive: true, force: true });
  });

  it('reuses unchanged HTML when the output files still exist', async () => {
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    const html = await readHome();
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
    expect(await readHome()).toBe(html);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('recreates every page after deleting only the output directory', async () => {
    await runBuild();
    const manifest = await loadCacheManifest(join(projectDir, '.stati'));
    expect(manifest).not.toBeNull();
    await rm(join(projectDir, 'dist'), { recursive: true });

    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    for (const entry of Object.values(manifest!.entries)) {
      expect(await readFile(join(projectDir, 'dist', entry.path), 'utf-8')).toContain('<html>');
    }
    expect(await readHome()).toContain('Welcome');
    for (const filename of ['styles.css', 'sitemap.xml', 'robots.txt']) {
      expect(await readFile(join(projectDir, 'dist', filename), 'utf-8')).not.toBe('');
    }
  });

  it('rebuilds only the missing page, including when its cache entry is frozen', async () => {
    await runBuild();
    const cacheDir = join(projectDir, '.stati');
    const manifest = await loadCacheManifest(cacheDir);
    expect(manifest).not.toBeNull();
    manifest!.entries['/index.html'] = {
      ...manifest!.entries['/index.html']!,
      publishedAt: '2000-01-01T00:00:00.000Z',
      maxAgeCapDays: 1,
    };
    await saveCacheManifest(cacheDir, manifest!);
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
    await rm(join(projectDir, 'dist', 'index.html'));

    expect(await runBuild()).toMatchObject({ cacheHits: 2, cacheMisses: 1 });
    expect(await readHome()).toContain('Welcome');
  });

  it('renders every page when ISG is explicitly disabled', async () => {
    await runBuild();
    config.isg = { enabled: false };
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).toContain('Welcome');
  });

  it('updates HTML to reference the new hashed bundle after TypeScript changes', async () => {
    await runBuild();
    const oldHtml = await readHome();
    const oldBundle = oldHtml.match(/src="([^"]+main-[^"]+\.js)"/)?.[1];
    expect(oldBundle).toBeDefined();
    await writeFile(join(projectDir, 'src', 'main.ts'), 'console.log("second bundle");');

    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    const html = await readHome();
    const newBundle = html.match(/src="([^"]+main-[^"]+\.js)"/)?.[1];
    expect(newBundle).toBeDefined();
    expect(newBundle).not.toBe(oldBundle);
    expect(html).not.toContain(oldBundle!);
    expect(await readFile(join(projectDir, 'dist', newBundle!), 'utf-8')).toContain(
      'second bundle',
    );
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
  });

  it('deletes bundle files that earlier builds and the dev server left behind', async () => {
    await runBuild();
    const assetsDir = join(projectDir, 'dist', '_assets');
    // The dev server writes stable names and source maps into the same directory
    await writeFile(join(assetsDir, 'main.js'), 'dev bundle');
    await writeFile(join(assetsDir, 'main.js.map'), '{}');
    await writeFile(join(assetsDir, 'vendor.js'), 'not a bundle');
    await writeFile(join(projectDir, 'src', 'main.ts'), 'console.log("second bundle");');

    await runBuild();
    const bundle = (await readHome()).match(/src="\/_assets\/(main-[^"]+\.js)"/)?.[1];
    expect(bundle).toBeDefined();
    expect((await readdir(assetsDir)).sort()).toEqual([bundle, 'vendor.js']);
  });

  it('invalidates only pages matched by a changed bundle', async () => {
    config.typescript!.bundles![0]!.include = ['/'];
    await runBuild();
    await writeFile(join(projectDir, 'src', 'main.ts'), 'console.log("targeted bundle");');
    expect(await runBuild()).toMatchObject({ cacheHits: 2, cacheMisses: 1 });
  });

  it('invalidates pages whose bundle matching changes', async () => {
    await runBuild();
    config.typescript!.bundles![0]!.include = ['/'];
    expect(await runBuild()).toMatchObject({ cacheHits: 1, cacheMisses: 2 });
    expect(await readHome()).toContain('main-');
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
  });

  it('updates HTML when bundles are added, reordered, and removed', async () => {
    await runBuild();
    await writeFile(join(projectDir, 'src', 'extra.ts'), 'console.log("extra bundle");');
    config.typescript!.bundles!.push({ entryPoint: 'extra.ts', bundleName: 'extra' });
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    const addedHtml = await readHome();
    expect(addedHtml.indexOf('main-')).toBeLessThan(addedHtml.indexOf('extra-'));

    config.typescript!.bundles!.reverse();
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    const reorderedHtml = await readHome();
    expect(reorderedHtml.indexOf('extra-')).toBeLessThan(reorderedHtml.indexOf('main-'));

    config.typescript!.bundles!.shift();
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).not.toContain('extra-');
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
  });

  it('removes stale bundle references when TypeScript is disabled', async () => {
    await runBuild();
    expect(await readHome()).toContain('main-');
    config.typescript = { enabled: false };
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).not.toContain('main-');
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
  });

  it('invalidates HTML when automatic bundle injection changes', async () => {
    await runBuild();
    config.typescript!.autoInject = false;
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).not.toContain('<script');
    config.typescript!.autoInject = true;
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).toContain('main-');
  });

  it('keeps manually rendered bundle URLs current when automatic injection is disabled', async () => {
    config.typescript!.autoInject = false;
    await writeFile(
      join(projectDir, 'site', 'layout.eta'),
      '<html><head></head><body><%~ stati.content %><% for (const path of stati.assets.bundlePaths) { %><script src="<%= path %>"></script><% } %></body></html>',
    );
    await runBuild();
    const oldHtml = await readHome();
    await writeFile(join(projectDir, 'src', 'main.ts'), 'console.log("manual bundle");');
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).not.toBe(oldHtml);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('preserves render input hashes through batched dev cache updates', async () => {
    setEnv('development');
    await runBuild();
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
    config.typescript!.autoInject = false;
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    expect(await readHome()).not.toContain('<script');
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
  });

  it('updates the injected search index URL when it changes', async () => {
    config.search = { enabled: true, hashFilename: false, indexName: 'first-index' };
    await runBuild();
    expect(await readHome()).toContain('/first-index.json');
    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
    config.search.indexName = 'second-index';
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    const html = await readHome();
    expect(html).toContain('/second-index.json');
    expect(html).not.toContain('/first-index.json');
    expect(await readFile(join(projectDir, 'dist', 'second-index.json'), 'utf-8')).not.toBe('');
  });

  it('reuses cached pages with the default hashed search index name', async () => {
    config.search = { enabled: true };
    await runBuild();
    const html = await readHome();
    const indexPath = html.match(/name="stati:search-index" content="\/([^"]+)"/)?.[1];
    expect(indexPath).toMatch(/^search-index-[0-9a-f]{8}\.json$/);

    expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });
    expect(await readHome()).toBe(html);
  });

  it('renames the hashed search index when indexed text changes and deletes the old one', async () => {
    config.search = { enabled: true };
    await runBuild();
    const indexFiles = async () =>
      (await readdir(join(projectDir, 'dist'))).filter((file) => file.startsWith('search-index'));
    const [oldIndex] = await indexFiles();
    expect(oldIndex).toBeDefined();

    await writeFile(join(projectDir, 'site', 'about.md'), '---\ntitle: About\n---\n# About us');
    // Every page links to the index, so every page renders with the new name
    expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
    const [newIndex, ...others] = await indexFiles();
    expect(others).toEqual([]);
    expect(newIndex).not.toBe(oldIndex);
    expect(await readHome()).toContain(`/${newIndex}`);
    expect(await readFile(join(projectDir, 'dist', newIndex!), 'utf-8')).toContain('About us');
  });
});
