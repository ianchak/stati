import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { access, mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { build } from '../../src/core/build.js';
import { loadConfig } from '../../src/config/loader.js';
import { loadCacheManifest } from '../../src/core/isg/index.js';
import { setEnv } from '../../src/env.js';
import { clearSourceCache } from '../../src/images/sources.js';
import type { Logger, StatiConfig } from '../../src/types/index.js';
import { pngBytes } from './fixtures.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

interface FakeCalls {
  variants: Array<{ sourcePath: string; outputs: Array<{ filePath: string; format: string }> }>;
  og: Array<{
    html: string;
    filePath: string;
    templatePath: string;
    fonts: Array<{ name: string; weight?: number; style?: string }>;
  }>;
}

declare global {
  var __statiImagesCalls: FakeCalls | undefined;
  var __statiImagesFailPartwayOn: string | undefined;
}

/**
 * Installs a stand-in for @stati/images in the project's node_modules. It writes small
 * placeholder files and records every request. `failOn` and `failOgOn` make the matching
 * variant or card requests fail; `source` replaces the module entirely.
 */
async function installFakeImagesPackage(
  projectDir: string,
  options: {
    apiVersion?: number;
    failOn?: string;
    failOgOn?: string;
    noDefaults?: boolean;
    source?: string;
  } = {},
): Promise<void> {
  const dir = join(projectDir, 'node_modules', '@stati', 'images');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: '@stati/images',
      version: '0.0.0-test',
      type: 'module',
      exports: { '.': { default: './index.js' } },
    }),
  );
  await writeFile(
    join(dir, 'index.js'),
    options.source ??
      `
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const failOn = ${JSON.stringify(options.failOn ?? null)};
const failOgOn = ${JSON.stringify(options.failOgOn ?? null)};
const noDefaults = ${JSON.stringify(options.noDefaults ?? false)};
export function createImageProvider() {
  const calls = globalThis.__statiImagesCalls;
  return {
    apiVersion: ${options.apiVersion ?? 1},
    version: 'fake-1',
    async createVariants(request) {
      calls.variants.push(request);
      if (failOn && request.sourcePath.includes(failOn)) throw new Error('encoder exploded');
      // Read per call, so a test can make a later build fail after writing some outputs
      const partway = globalThis.__statiImagesFailPartwayOn;
      if (partway && request.sourcePath.includes(partway)) {
        for (const output of request.outputs.slice(0, -1)) {
          writeFileSync(output.filePath, 'partial');
        }
        throw new Error('encoder exploded partway');
      }
      for (const output of request.outputs) {
        mkdirSync(dirname(output.filePath), { recursive: true });
        writeFileSync(output.filePath, output.format + ':' + output.width);
      }
    },
    async renderOgImage(request) {
      calls.og.push(request);
      if (failOgOn && request.filePath.includes(failOgOn)) throw new Error('card exploded');
      writeFileSync(request.filePath, 'png');
    },
    loadOgDefaults: noDefaults
      ? undefined
      : async () => ({
          template: '<div style="display:flex"><%= stati.page.title %></div>',
          fonts: [{ name: 'Fake', data: Buffer.from('font') }],
        }),
  };
}
`,
  );
}

describe('image pipeline in builds', () => {
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
  const runBuild = (options: { force?: boolean } = {}) => build({ logger, ...options });
  const read = (path: string) => readFile(join(projectDir, path), 'utf-8');
  const exists = (path: string) =>
    access(join(projectDir, path)).then(
      () => true,
      () => false,
    );
  const write = async (path: string, content: string | Buffer) => {
    await mkdir(join(projectDir, path, '..'), { recursive: true });
    await writeFile(join(projectDir, path), content);
  };
  /** Rewrites a file with a modification time that differs from the cached one. */
  const replace = async (path: string, content: string | Buffer, secondsAhead = 60) => {
    await write(path, content);
    const time = new Date(Date.now() + secondsAhead * 1000);
    await utimes(join(projectDir, path), time, time);
  };

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'stati-images-build-'));
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    setEnv('production');
    clearSourceCache();
    globalThis.__statiImagesCalls = { variants: [], og: [] };
    vi.mocked(logger.warning).mockClear();
    vi.mocked(logger.error).mockClear();

    config = {
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Image Test', baseUrl: 'https://example.com' },
      isg: { enabled: true, ttlSeconds: 3600 },
    };
    vi.mocked(loadConfig).mockImplementation(async () => config);

    await write(
      'site/layout.eta',
      '<!DOCTYPE html><html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>',
    );
    await write('site/index.md', '---\ntitle: Home\n---\n![Hero](/images/hero.png)\n\nWelcome.');
    await write(
      'site/blog/post.md',
      '---\ntitle: Post\n---\n# Post\n\nOne.\n\nTwo.\n\nThree.\n\n![Photo](./photo.png)',
    );
    await write('site/about.md', '---\ntitle: About\n---\nNo images here.');
    await write('public/images/hero.png', pngBytes(1600, 900));
    await write('site/blog/photo.png', pngBytes(800, 600));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setEnv('development');
    globalThis.__statiImagesCalls = undefined;
    globalThis.__statiImagesFailPartwayOn = undefined;
    await rm(projectDir, { recursive: true, force: true });
  });

  describe('built-in behavior', () => {
    it('adds intrinsic dimensions and lazy loading without configuration', async () => {
      await runBuild();

      expect(await read('dist/index.html')).toContain(
        '<img src="/images/hero.png" alt="Hero" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async">',
      );
      const post = await read('dist/blog/post.html');
      const copy = post.match(/src="\/(_img\/photo-[0-9a-f]{8}\.png)"/);
      expect(copy).not.toBeNull();
      expect(post).toContain('width="800" height="600" loading="lazy" decoding="async"');
      expect(await exists(`dist/${copy![1]}`)).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('leaves Markdown images as authored with images: false', async () => {
      config.images = false;
      await runBuild();

      expect(await read('dist/index.html')).toContain('<img src="/images/hero.png" alt="Hero">');
      expect(await read('dist/blog/post.html')).toContain('<img src="./photo.png" alt="Photo">');
      expect(await exists('dist/_img')).toBe(false);
    });

    it('renders stati.image() in templates', async () => {
      await write(
        'site/about.eta',
        "<html><head></head><body><%~ stati.image('/images/hero.png', { alt: 'Banner', priority: true, class: 'hero' }) %><%~ stati.image(stati.page.missingCover) %></body></html>",
      );
      await write('site/about.md', '---\ntitle: About\nlayout: about\n---\nNo images here.');
      await runBuild();

      expect(await read('dist/about.html')).toContain(
        '<body><img src="/images/hero.png" alt="Banner" class="hero" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async"></body>',
      );
    });

    it('renders stati.image() as a plain, escaped <img> with images: false', async () => {
      config.images = false;
      await write(
        'site/about.eta',
        `<html><head></head><body><%~ stati.image('/images/hero.png?v="2"', { alt: 'Tom & "Jerry"', title: 'T', class: 'hero' }) %><%~ stati.image('') %></body></html>`,
      );
      await write('site/about.md', '---\ntitle: About\nlayout: about\n---\nNo images here.');
      await runBuild();

      expect(await read('dist/about.html')).toContain(
        '<body><img src="/images/hero.png?v=&quot;2&quot;" alt="Tom &amp; &quot;Jerry&quot;" title="T" class="hero"></body>',
      );
    });

    it('leaves remote and unreadable template images as written and asks for alt text', async () => {
      await write('public/images/broken.png', 'not a png');
      await write(
        'site/about.eta',
        "<html><head></head><body><%~ stati.image('/images/hero.png') %><%~ stati.image('https://cdn.example.com/a.png', { alt: 'Remote' }) %><%~ stati.image('/images/broken.png', { alt: 'Broken' }) %></body></html>",
      );
      await write('site/about.md', '---\ntitle: About\nlayout: about\n---\nNo images here.');
      await runBuild();

      const about = await read('dist/about.html');
      expect(about).toContain(
        '<img src="/images/hero.png" alt="" width="1600" height="900" loading="lazy" decoding="async">',
      );
      expect(about).toContain(
        '<img src="https://cdn.example.com/a.png" alt="Remote" loading="lazy" decoding="async">',
      );
      expect(about).toContain(
        '<img src="/images/broken.png" alt="Broken" loading="lazy" decoding="async">',
      );
      expect(logger.warning).toHaveBeenCalledWith(
        "stati.image('/images/hero.png') on /about has no alt text. Pass { alt: '' } for decorative images.",
      );
      expect(logger.warning).toHaveBeenCalledWith(
        'Could not read the dimensions of public/images/broken.png. It is left as written.',
      );
    });

    it('leaves a Markdown image marked ?raw as written, without the marker', async () => {
      await write('site/about.md', '---\ntitle: About\n---\n![Raw](/images/hero.png?raw)');
      await runBuild();
      expect(await read('dist/about.html')).toContain('<img src="/images/hero.png" alt="Raw">');
    });

    it('keeps attributes that plugins set on a Markdown image, numbers included', async () => {
      config.markdown = {
        configure: (md) => {
          md.core.ruler.push('test_image_attributes', (state) => {
            for (const token of state.tokens) {
              for (const child of token.children ?? []) {
                if (child.type !== 'image') continue;
                child.attrSet('title', 2);
                child.attrSet('class', 'shot');
                child.attrSet('data-index', 1);
              }
            }
          });
        },
      };
      await runBuild();

      expect(await read('dist/index.html')).toContain(
        '<img src="/images/hero.png" alt="Hero" title="2" class="shot" data-index="1" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async">',
      );
    });

    it('rebuilds only the pages that show a replaced image', async () => {
      expect(await runBuild()).toMatchObject({ cacheMisses: 3 });
      expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });

      await replace('public/images/hero.png', pngBytes(1200, 900));
      expect(await runBuild()).toMatchObject({ cacheHits: 2, cacheMisses: 1 });
      expect(await read('dist/index.html')).toContain('width="1200" height="900"');
    });

    it('keeps a page with a missing image cached until the image appears', async () => {
      await write('site/about.md', '---\ntitle: About\n---\n![Gone](/images/missing.png)');
      await runBuild();
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('Image not found'));
      expect(await read('dist/about.html')).toContain('<img src="/images/missing.png" alt="Gone">');

      expect(await runBuild()).toMatchObject({ cacheHits: 3 });

      await write('public/images/missing.png', pngBytes(10, 20));
      expect(await runBuild()).toMatchObject({ cacheMisses: 1 });
      expect(await read('dist/about.html')).toContain('width="10" height="20"');
    });

    it('regenerates a copied image deleted from the output', async () => {
      await runBuild();
      const post = await read('dist/blog/post.html');
      const copy = post.match(/src="\/(_img\/photo-[0-9a-f]{8}\.png)"/)![1];
      await rm(join(projectDir, 'dist', copy!));

      expect(await runBuild()).toMatchObject({ cacheMisses: 1 });
      expect(await exists(`dist/${copy}`)).toBe(true);
    });
  });

  describe('@stati/images features', () => {
    it.each([
      [
        { responsive: true },
        'images.responsive requires @stati/images. Run: npm i -D @stati/images',
      ],
      [{ og: true }, 'images.og requires @stati/images. Run: npm i -D @stati/images'],
      [{ responsive: true, og: true }, 'images.responsive and images.og require @stati/images'],
    ])('fails when %j is on without the package', async (images, message) => {
      config.images = images;
      await expect(runBuild()).rejects.toThrow(message);
    });

    it('fails in the dev server too, even though dev skips generation', async () => {
      setEnv('development');
      config.images = { responsive: true };
      await expect(runBuild()).rejects.toThrow('images.responsive requires @stati/images');
    });

    it('rejects an incompatible provider', async () => {
      await installFakeImagesPackage(projectDir, { apiVersion: 2 });
      config.images = { responsive: true };
      await expect(runBuild()).rejects.toThrow('is not compatible with @stati/core');
    });

    it('generates responsive variants once and reuses them', async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { responsive: true };
      await runBuild();

      const home = await read('dist/index.html');
      expect(home).toMatch(
        /<picture><source type="image\/avif" srcset="\/_img\/hero-[0-9a-f]{8}-480\.avif 480w, \/_img\/hero-[0-9a-f]{8}-960\.avif 960w, \/_img\/hero-[0-9a-f]{8}-1440\.avif 1440w" sizes="100vw">/,
      );
      expect(home).toMatch(
        /<img src="\/_img\/hero-[0-9a-f]{8}-1440\.png" srcset="[^"]+" sizes="100vw" alt="Hero" width="1600" height="900"/,
      );
      const calls = globalThis.__statiImagesCalls!;
      expect(calls.variants).toHaveLength(2);
      for (const output of calls.variants.flatMap((call) => call.outputs)) {
        expect(
          await exists(join('dist', output.filePath.slice(join(projectDir, 'dist').length))),
        ).toBe(true);
      }

      await runBuild({ force: true });
      expect(calls.variants).toHaveLength(2);
    });

    it('falls back to plain images and retries when encoding fails', async () => {
      await installFakeImagesPackage(projectDir, { failOn: 'hero' });
      config.images = { responsive: true };
      await runBuild();

      const home = await read('dist/index.html');
      expect(home).not.toContain('<picture>');
      expect(home).toContain('<img src="/images/hero.png" alt="Hero" width="1600" height="900"');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('encoder exploded'));
      const manifest = await loadCacheManifest(join(projectDir, '.stati'));
      expect(manifest!.entries['/index.html']!.inputsHash).toBe('STALE');
      expect(await read('dist/blog/post.html')).toContain('<picture>');

      expect(await runBuild()).toMatchObject({ cacheMisses: 1 });
    });

    it('writes variants for identical images saved under different names', async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { responsive: true };
      await write('public/images/banner.png', pngBytes(1600, 900));
      await write('site/about.md', '---\ntitle: About\n---\n![Banner](/images/banner.png)');
      await runBuild();

      for (const page of ['dist/index.html', 'dist/about.html']) {
        const files = [...(await read(page)).matchAll(/\/(_img\/[^"\s,]+)/g)].map((m) => m[1]!);
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
          expect(await exists(`dist/${file}`)).toBe(true);
        }
      }
    });

    it('removes files a failed job wrote, but keeps files from earlier builds', async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { responsive: true };
      const heroFiles = async () =>
        (await readdir(join(projectDir, 'dist', '_img'))).filter((f) => f.startsWith('hero-'));

      // One output fails after the others are written: none of them may stay behind untracked
      globalThis.__statiImagesFailPartwayOn = 'hero';
      await runBuild();
      expect(await heroFiles()).toEqual([]);
      expect(await read('dist/index.html')).not.toContain('<picture>');

      // After a good build, a retry that fails must keep the files a cached page still shows.
      // Losing the images manifest makes another page's render run the job again.
      globalThis.__statiImagesFailPartwayOn = undefined;
      await runBuild();
      const written = await heroFiles();
      expect(written).toHaveLength(9);
      await rm(join(projectDir, '.stati', 'images', 'manifest.json'));
      await write('site/about.md', '---\ntitle: About\n---\n![Hero](/images/hero.png)');
      globalThis.__statiImagesFailPartwayOn = 'hero';
      expect(await runBuild()).toMatchObject({ cacheHits: 2, cacheMisses: 1 });

      expect(await heroFiles()).toEqual(written);
      expect(await read('dist/index.html')).toContain('<picture>');
      expect(await read('dist/about.html')).not.toContain('<picture>');
    });

    it('copies a co-located image for the fallback when its variants fail', async () => {
      await installFakeImagesPackage(projectDir, { failOn: 'photo' });
      config.images = { responsive: true };
      await runBuild();

      const post = await read('dist/blog/post.html');
      expect(post).not.toContain('<picture>');
      const copy = post.match(
        /<img src="\/(_img\/photo-[0-9a-f]{8}\.png)" alt="Photo" width="800" height="600"/,
      );
      expect(copy).not.toBeNull();
      expect(await exists(`dist/${copy![1]}`)).toBe(true);
    });

    it('explains a package that does not export createImageProvider', async () => {
      await installFakeImagesPackage(projectDir, { source: 'export const version = 1;' });
      config.images = { responsive: true };
      await expect(runBuild()).rejects.toThrow(
        'Failed to load @stati/images: @stati/images does not export createImageProvider()',
      );
    });

    it('asks for a newer package when the provider cannot draw Open Graph images', async () => {
      await installFakeImagesPackage(projectDir, {
        source:
          "export function createImageProvider() { return { apiVersion: 1, version: 'old', async createVariants() {} }; }",
      });
      config.images = { og: true };
      await expect(runBuild()).rejects.toThrow('images.og needs a newer @stati/images (old)');
    });

    it('skips variants in the dev server and re-renders them for production', async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { responsive: true };
      setEnv('development');
      await runBuild();
      expect(await read('dist/index.html')).not.toContain('<picture>');
      expect(globalThis.__statiImagesCalls!.variants).toHaveLength(0);

      setEnv('production');
      expect(await runBuild()).toMatchObject({ cacheMisses: 3 });
      expect(await read('dist/index.html')).toContain('<picture>');
    });

    it('prunes generated images no page uses, but never files from public', async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { responsive: true };
      await write('public/_img/keep.txt', 'mine');
      await runBuild();
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('shares its URL'));
      const heroFile = (await read('dist/index.html')).match(
        /\/(_img\/hero-[0-9a-f]{8}-480\.avif)/,
      )![1]!;
      expect(await exists(`dist/${heroFile}`)).toBe(true);

      await write('site/index.md', '---\ntitle: Home\n---\nNo hero any more.');
      await runBuild();

      expect(await exists(`dist/${heroFile}`)).toBe(false);
      expect(await exists('dist/_img/keep.txt')).toBe(true);
      expect(await read('dist/blog/post.html')).toContain('<picture>');
      const post = await read('dist/blog/post.html');
      const photoFile = post.match(/\/(_img\/photo-[0-9a-f]{8}-480\.avif)/)![1];
      expect(await exists(`dist/${photoFile}`)).toBe(true);
    });
  });

  describe('Open Graph images', () => {
    beforeEach(async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { og: true };
    });

    const ogImageOf = (html: string) =>
      html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];

    it('adds a generated og:image to every page', async () => {
      await runBuild();

      const home = await read('dist/index.html');
      const url = ogImageOf(home);
      expect(url).toMatch(/^https:\/\/example\.com\/_img\/og\/index-[0-9a-f]{8}\.png$/);
      expect(home).toContain('<meta property="og:image:width" content="1200">');
      expect(home).toContain('<meta property="og:image:height" content="630">');
      expect(home).toContain(`<meta name="twitter:image" content="${url}">`);
      expect(await exists(`dist${new URL(url!).pathname}`)).toBe(true);
      expect(ogImageOf(await read('dist/blog/post.html'))).toMatch(
        /\/_img\/og\/blog-post-[0-9a-f]{8}\.png$/,
      );
    });

    it('lets front matter set its own image or opt out', async () => {
      await write(
        'site/about.md',
        '---\ntitle: About\nseo:\n  openGraph:\n    image: /images/custom.png\n---\nAbout.',
      );
      await write(
        'site/blog/post.md',
        '---\ntitle: Post\nseo:\n  openGraph:\n    image: false\n---\nPost.',
      );
      await runBuild();

      expect(ogImageOf(await read('dist/about.html'))).toBe(
        'https://example.com/images/custom.png',
      );
      const post = await read('dist/blog/post.html');
      expect(post).not.toContain('og:image');
      expect(post).not.toContain('twitter:image');
      expect(globalThis.__statiImagesCalls!.og).toHaveLength(1);
    });

    it('skips pages matching og.exclude', async () => {
      config.images = { og: { exclude: ['/blog/**'] } };
      await runBuild();
      expect(await read('dist/blog/post.html')).not.toContain('og:image');
      expect(ogImageOf(await read('dist/index.html'))).toBeDefined();
    });

    it('skips the 404 page without an exclude pattern', async () => {
      await write('site/404.md', '---\ntitle: Page not found\n---\nNot here.');
      await write('site/blog/404.md', '---\ntitle: Blog errors\n---\nAbout 404s.');
      await runBuild();

      const notFound = await read('dist/404.html');
      expect(notFound).not.toContain('og:image');
      expect(notFound).not.toContain('twitter:image');
      const calls = globalThis.__statiImagesCalls!.og.map((call) => call.filePath);
      expect(calls.some((path) => /[\\/]og[\\/]404-/.test(path))).toBe(false);
      // A page named 404 in a subfolder gets its card
      expect(ogImageOf(await read('dist/blog/404.html'))).toMatch(/\/_img\/og\/blog-404-/);
    });

    it('uses the nearest og.eta and keys the image by its rendered HTML', async () => {
      await write(
        'site/blog/og.eta',
        '<div style="display:flex"><%= stati.page.title %> | <%= stati.site.title %><%= stati.content %></div>',
      );
      await runBuild();
      const calls = globalThis.__statiImagesCalls!;
      const postCall = calls.og.find((call) => call.filePath.includes('blog-post'));
      expect(postCall!.templatePath).toBe('site/blog/og.eta');
      expect(postCall!.html).toBe('<div style="display:flex">Post | Image Test</div>');
      const first = ogImageOf(await read('dist/blog/post.html'));

      // A body edit does not change the card
      await write(
        'site/blog/post.md',
        '---\ntitle: Post\n---\n# Post\n\nOne edited.\n\n![Photo](./photo.png)',
      );
      await runBuild();
      expect(ogImageOf(await read('dist/blog/post.html'))).toBe(first);

      // The title does
      await write('site/blog/post.md', '---\ntitle: Renamed\n---\nOne.');
      await runBuild();
      expect(ogImageOf(await read('dist/blog/post.html'))).not.toBe(first);

      // So does site config the template reads, once the page renders again
      const renamed = ogImageOf(await read('dist/blog/post.html'));
      config.site = { ...config.site, title: 'New Name' };
      await runBuild({ force: true });
      expect(ogImageOf(await read('dist/blog/post.html'))).not.toBe(renamed);
    });

    it('rebuilds pages when their og.eta changes', async () => {
      await write('site/blog/og.eta', '<div style="display:flex"><%= stati.page.title %></div>');
      await runBuild();
      await replace(
        'site/blog/og.eta',
        '<div style="display:flex">New <%= stati.page.title %></div>',
      );
      expect(await runBuild()).toMatchObject({ cacheMisses: 1, cacheHits: 2 });
    });

    it('gives generateSEO() in an included head template the generated image', async () => {
      config.seo = { autoInject: false };
      await write('site/partials/head.eta', '<%~ stati.generateSEO() %>');
      await write(
        'site/layout.eta',
        `<!DOCTYPE html><html><head><%~ stati.include('partials/head') %></head><body><%~ stati.content %></body></html>`,
      );
      await runBuild();

      expect(logger.error).not.toHaveBeenCalled();
      const home = await read('dist/index.html');
      expect(ogImageOf(home)).toMatch(/\/_img\/og\/index-[0-9a-f]{8}\.png$/);
      expect(home).toContain('<meta name="twitter:image"');
      expect(home).not.toContain('<!--stati:');
    });

    it('renders og.eta like any template: includes, a layout and helpers', async () => {
      config.helpers = { shout: (text: string) => text.toUpperCase() };
      await write(
        'site/og.eta',
        `<% stati.layout('./og-frame', { tone: 'dark' }) %><%~ stati.include('partials/card-title') %>`,
      );
      await write(
        'site/og-frame.eta',
        `<div style="display:flex" data-tone="<%= stati.props.tone %>"><%~ stati.body %></div>`,
      );
      await write(
        'site/partials/card-title.eta',
        '<span><%= stati.helpers.shout(stati.page.title) %></span>',
      );
      await runBuild();

      const home = globalThis.__statiImagesCalls!.og.find((call) =>
        call.filePath.includes('index-'),
      );
      expect(home!.html).toBe('<div style="display:flex" data-tone="dark"><span>HOME</span></div>');
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("renders a template that og.eta and the layout both include with each one's values", async () => {
      await write(
        'site/partials/which.eta',
        `<%= stati.og ? 'card' : 'page' %>:<%= stati.content === '' ? 'no body' : 'body' %>`,
      );
      await write(
        'site/og.eta',
        `<div style="display:flex"><%~ stati.include('partials/which') %></div>`,
      );
      await write(
        'site/layout.eta',
        `<html><head></head><body><%~ stati.include('partials/which') %></body></html>`,
      );
      await runBuild();

      expect(globalThis.__statiImagesCalls!.og[0]!.html).toBe(
        '<div style="display:flex">card:no body</div>',
      );
      expect(await read('dist/about.html')).toContain('<body>page:body</body>');
    });

    it('records og.eta and what it includes, so editing an include rebuilds its pages', async () => {
      await write(
        'site/blog/og.eta',
        `<div style="display:flex"><%~ stati.include('partials/badge') %></div>`,
      );
      await write('site/partials/badge.eta', 'v1');
      await runBuild();
      const manifest = await loadCacheManifest(join(projectDir, '.stati'));
      expect(manifest!.entries['/blog/post.html']!.deps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/site\/blog\/og\.eta$/),
          expect.stringMatching(/site\/partials\/badge\.eta$/),
        ]),
      );
      expect(manifest!.entries['/blog/post.html']!.deps[0]).toMatch(/site\/layout\.eta$/);

      await replace('site/partials/badge.eta', 'v2');
      expect(await runBuild()).toMatchObject({ cacheMisses: 1, cacheHits: 2 });
    });

    it('rebuilds the pages a new og.eta in their folder applies to', async () => {
      await runBuild();
      await write('site/blog/og.eta', '<div style="display:flex">Blog card</div>');

      expect(await runBuild()).toMatchObject({ cacheMisses: 1, cacheHits: 2 });
      const post = globalThis.__statiImagesCalls!.og.at(-1)!;
      expect(post.templatePath).toBe('site/blog/og.eta');
    });

    it('lets the built-in template include templates by path, but not by relative name', async () => {
      await installFakeImagesPackage(projectDir, {
        source: `
import { writeFileSync } from 'node:fs';
export function createImageProvider() {
  const calls = globalThis.__statiImagesCalls;
  return {
    apiVersion: 1,
    version: 'fake-builtin',
    async createVariants() {},
    async renderOgImage(request) { calls.og.push(request); writeFileSync(request.filePath, 'png'); },
    loadOgDefaults: async () => ({
      template: "<div style=\\"display:flex\\"><%~ stati.include('partials/badge') %><%~ stati.include('./badge') %></div>",
      fonts: [{ name: 'Fake', data: Buffer.from('font') }],
    }),
  };
}
`,
      });
      await write('site/partials/badge.eta', 'badge');
      await runBuild();

      expect(globalThis.__statiImagesCalls!.og[0]!.html).toBe(
        '<div style="display:flex">badge</div>',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "stati.include('./badge'): the name is relative, and the built-in Open Graph template has no file",
        ),
      );
    });

    it('exposes the generated image to layouts as stati.ogImage', async () => {
      config.seo = { autoInject: false };
      await write(
        'site/layout.eta',
        '<html><head><% if (stati.ogImage) { %><meta property="og:image" content="<%= stati.ogImage.url %>"><% } %></head><body></body></html>',
      );
      await runBuild();
      expect(ogImageOf(await read('dist/index.html'))).toMatch(
        /^https:\/\/example\.com\/_img\/og\//,
      );
    });

    it.each([
      ['responsive images', { responsive: true, og: true }],
      ['copied co-located images', { og: true }],
    ])('draws stati.image() in cards from the original file, with %s', async (_label, images) => {
      config.images = images;
      await write(
        'site/og.eta',
        `<div style="display:flex"><%~ stati.image('/images/hero.png', { alt: '' }) %></div>`,
      );
      await write(
        'site/blog/og.eta',
        `<div style="display:flex"><%~ stati.image('./photo.png', { alt: '' }) %></div>`,
      );
      await runBuild();

      const calls = globalThis.__statiImagesCalls!.og;
      expect(calls).toHaveLength(3);
      for (const call of calls) {
        expect(call.html).toContain('src="data:image/png;base64,');
        expect(call.html).not.toContain('src="/_img/');
      }
    });

    it('writes a card for each page, even when pages draw the same card', async () => {
      await write('site/og.eta', '<div style="display:flex"><%= stati.site.title %></div>');
      await runBuild();

      for (const page of ['dist/index.html', 'dist/about.html', 'dist/blog/post.html']) {
        const url = ogImageOf(await read(page));
        expect(await exists(`dist${new URL(url!).pathname}`)).toBe(true);
      }
    });

    it('gives generateSEO() in the layout the generated image', async () => {
      config.seo = { autoInject: false };
      await write(
        'site/layout.eta',
        '<!DOCTYPE html><html><head><%~ stati.generateSEO() %></head><body><%~ stati.content %></body></html>',
      );
      await runBuild();

      const home = await read('dist/index.html');
      expect(ogImageOf(home)).toMatch(/^https:\/\/example\.com\/_img\/og\/index-[0-9a-f]{8}\.png$/);
      expect(home).toContain('<meta name="twitter:image"');
    });

    it('passes configured fonts ahead of the built-in ones', async () => {
      await write('og/brand.woff', 'wOFF brand');
      config.images = {
        og: { fonts: [{ name: 'Brand', path: 'og/brand.woff', weight: 700, style: 'italic' }] },
      };
      await runBuild();

      const fonts = globalThis.__statiImagesCalls!.og[0]!.fonts;
      expect(fonts.map(({ name, weight, style }) => ({ name, weight, style }))).toEqual([
        { name: 'Brand', weight: 700, style: 'italic' },
        { name: 'Fake', weight: undefined, style: undefined },
      ]);
    });

    it.each([
      ['og/missing.woff', 'images.og.fonts: font file not found: og/missing.woff'],
      ['og/brand.woff2', "og/brand.woff2 is WOFF2, which the image renderer can't read"],
    ])('rejects the font %s', async (path, message) => {
      await write('og/brand.woff2', 'wOF2 data');
      config.images = { og: { fonts: [{ name: 'Brand', path }] } };
      await expect(runBuild()).rejects.toThrow(message);
    });

    it('needs at least one font', async () => {
      await installFakeImagesPackage(projectDir, { noDefaults: true });
      await expect(runBuild()).rejects.toThrow('images.og needs at least one font');
    });

    it('logs an og.eta that fails and leaves its pages without a generated image', async () => {
      await write('site/blog/og.eta', '<div><%= stati.page.missing.title %></div>');
      await runBuild();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to render site/blog/og.eta for /blog/post:'),
      );
      expect(await read('dist/blog/post.html')).not.toContain('og:image');
      expect(ogImageOf(await read('dist/index.html'))).toBeDefined();
    });

    it('renders a page again, and logs the og.eta error again, until the card renders', async () => {
      await write('site/blog/og.eta', '<div><%= stati.page.missing.title %></div>');
      await runBuild();
      expect(logger.error).toHaveBeenCalledTimes(1);

      vi.mocked(logger.error).mockClear();
      await runBuild();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to render site/blog/og.eta for /blog/post:'),
      );

      await write('site/blog/og.eta', '<div>fixed</div>');
      vi.mocked(logger.error).mockClear();
      await runBuild();
      expect(logger.error).not.toHaveBeenCalled();
      expect(await read('dist/blog/post.html')).toContain('og:image');
    });

    it('sends an og.eta error to the dev server overlay', async () => {
      setEnv('development');
      config.images = { og: true, dev: 'full' };
      await write('site/blog/og.eta', '<div><%= stati.page.missing.title %></div>');
      await expect(runBuild()).rejects.toMatchObject({ name: 'TemplateError' });
    });

    it('removes the generated tags and retries when a card fails', async () => {
      await installFakeImagesPackage(projectDir, { failOgOn: 'blog-post' });
      await runBuild();

      const post = await read('dist/blog/post.html');
      expect(post).not.toContain('og:image');
      expect(post).not.toContain('twitter:image');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('card exploded'));
      const manifest = await loadCacheManifest(join(projectDir, '.stati'));
      expect(manifest!.entries['/blog/post.html']!.inputsHash).toBe('STALE');
      expect(ogImageOf(await read('dist/index.html'))).toBeDefined();
    });

    it('fails the dev build when a card fails, after saving the cache', async () => {
      await installFakeImagesPackage(projectDir, { failOgOn: 'blog-post' });
      setEnv('development');
      config.images = { og: true, dev: 'full' };
      await expect(runBuild()).rejects.toThrow(
        'Open Graph image failed for built-in Open Graph template (/blog/post): card exploded',
      );
      expect(await exists('.stati/manifest.json')).toBe(true);
    });

    it.each(['http://localhost:3000', 'example.com', 'ftp://example.com'])(
      'requires a public site.baseUrl in production, not %s',
      async (baseUrl) => {
        config.site = { title: 'Image Test', baseUrl };
        await expect(runBuild()).rejects.toThrow('images.og needs site.baseUrl');
      },
    );
  });
  describe('served from a base path', () => {
    beforeEach(() => {
      config.site = { title: 'Image Test', baseUrl: 'https://example.com/sub/' };
    });

    it('puts the base path in front of image URLs and copies files to the output root', async () => {
      await runBuild();

      expect(await read('dist/index.html')).toContain(
        '<img src="/sub/images/hero.png" alt="Hero" width="1600" height="900" loading="eager"',
      );
      const post = await read('dist/blog/post.html');
      const copy = post.match(/src="\/sub\/(_img\/photo-[0-9a-f]{8}\.png)"/);
      expect(copy).not.toBeNull();
      expect(await exists(`dist/${copy![1]}`)).toBe(true);
      expect(await exists('dist/sub')).toBe(false);
      expect(logger.warning).not.toHaveBeenCalled();
    });

    it('prefixes root-absolute images that are left as written, not remote ones', async () => {
      await write(
        'site/about.md',
        '---\ntitle: About\n---\n![Raw](/images/hero.png?raw) ![Gone](/images/missing.png) ![Remote](https://cdn.example.com/a.png)',
      );
      await runBuild();

      const about = await read('dist/about.html');
      expect(about).toContain('<img src="/sub/images/hero.png" alt="Raw">');
      expect(about).toContain('<img src="/sub/images/missing.png" alt="Gone">');
      expect(about).toContain('<img src="https://cdn.example.com/a.png" alt="Remote">');
    });

    it('prefixes Markdown and template images with images: false', async () => {
      config.images = false;
      await write(
        'site/about.eta',
        "<html><head></head><body><%~ stati.image('/images/hero.png', { alt: 'Banner' }) %></body></html>",
      );
      await write('site/about.md', '---\ntitle: About\nlayout: about\n---\nNo images here.');
      await runBuild();

      expect(await read('dist/index.html')).toContain(
        '<img src="/sub/images/hero.png" alt="Hero">',
      );
      expect(await read('dist/blog/post.html')).toContain('<img src="./photo.png" alt="Photo">');
      expect(await read('dist/about.html')).toContain(
        '<body><img src="/sub/images/hero.png" alt="Banner"></body>',
      );
    });

    it('prefixes responsive variants and goes back to the plain image when encoding fails', async () => {
      await installFakeImagesPackage(projectDir, { failOn: 'hero' });
      config.images = { responsive: true };
      await runBuild();

      const post = await read('dist/blog/post.html');
      expect(post).toMatch(
        /<source type="image\/avif" srcset="\/sub\/_img\/photo-[0-9a-f]{8}-480\.avif 480w/,
      );
      expect(post).toMatch(
        /<img src="\/sub\/_img\/photo-[0-9a-f]{8}-800\.png" srcset="\/sub\/_img\//,
      );
      // The failed image is back to plain markup that keeps the prefix
      const home = await read('dist/index.html');
      expect(home).not.toContain('<picture>');
      expect(home).toContain('<img src="/sub/images/hero.png" alt="Hero" width="1600"');
    });

    it('makes og:image absolute with the base path and draws cards from the original file', async () => {
      await installFakeImagesPackage(projectDir);
      config.images = { responsive: true, og: true };
      await write(
        'site/og.eta',
        `<div style="display:flex"><%~ stati.image('/images/hero.png', { alt: '' }) %><img src="<%= stati.url('/images/hero.png') %>"></div>`,
      );
      await runBuild();

      const url = (await read('dist/index.html')).match(
        /<meta property="og:image" content="([^"]+)">/,
      )?.[1];
      expect(url).toMatch(/^https:\/\/example\.com\/sub\/_img\/og\/index-[0-9a-f]{8}\.png$/);
      expect(await exists(`dist${new URL(url!).pathname.slice('/sub'.length)}`)).toBe(true);
      const withImages = globalThis.__statiImagesCalls!.og.filter((call) =>
        call.html.includes('<img'),
      );
      expect(withImages.length).toBeGreaterThan(0);
      for (const call of withImages) {
        expect(call.html).not.toContain('src="/');
        expect(call.html.match(/src="data:image\/png;base64,/g)).toHaveLength(2);
      }
    });

    it('rebuilds every page when the base path changes', async () => {
      expect(await runBuild()).toMatchObject({ cacheMisses: 3 });
      expect(await runBuild()).toMatchObject({ cacheHits: 3, cacheMisses: 0 });

      config.site = { title: 'Image Test', baseUrl: 'https://example.com/other' };
      expect(await runBuild()).toMatchObject({ cacheHits: 0, cacheMisses: 3 });
      expect(await read('dist/index.html')).toContain('src="/other/images/hero.png"');
    });
  });
});
