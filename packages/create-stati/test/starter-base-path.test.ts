import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ExampleManager, TEMPLATE_NAMES } from '../src/examples.js';
import { loadConfig } from '../../core/src/config/loader.js';
import { setEnv } from '../../core/src/env.js';
import type { StatiConfig } from '../../core/src/types/index.js';
import { createSiteFixture, type SiteFixture } from '../../core/test/core/site-fixture.js';

vi.mock('../../core/src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

// The starter configs import defineConfig, which only types the config
vi.mock('@stati/core', () => ({
  defineConfig: (config: StatiConfig) => config,
}));

/** A build of a starter's sample site can take seconds while other test files run */
const BUILD_TIMEOUT = 30_000;

/**
 * A starter's config with `site.baseUrl` replaced. The config is JavaScript and has no types.
 */
const starterConfig = async (name: string, baseUrl: string): Promise<StatiConfig> => {
  const { default: config } = (await import(`../../../examples/${name}/stati.config.js`)) as {
    default: StatiConfig;
  };
  return { ...config, site: { ...config.site, baseUrl } };
};

/**
 * Every starter builds a site that works wherever it is served: each link and asset path it
 * writes from the site root goes through stati.url(), which adds the base path of a site
 * served from a subfolder. Each test copies a starter as create-stati does and builds it with
 * core, with site.baseUrl set to the address the site is served from.
 */
describe.each([
  // Two levels deep, as on a GitHub Pages project site in a folder
  { where: 'from a subfolder', baseUrl: 'https://example.com/sites/demo', basePath: '/sites/demo' },
  { where: 'from the root', baseUrl: 'https://example.com', basePath: '' },
])('starters served $where', ({ baseUrl, basePath }) => {
  let site: SiteFixture;

  beforeEach(() => {
    setEnv('production');
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  /** The paths of the HTML files under `dist/`, with forward slashes */
  const htmlFiles = async () =>
    (await readdir(join(site.dir, 'dist'), { recursive: true }))
      .map((file) => file.replaceAll('\\', '/'))
      .filter((file) => file.endsWith('.html'));

  /** The `href` and `src` values of a page that are paths from the root of the host */
  const rootPaths = (html: string) =>
    [...html.matchAll(/\s(?:href|src)="(\/(?!\/)[^"]*)"/g)].map((match) => match[1] ?? '');

  /**
   * Whether a root path, with the base path removed, names a file the build wrote. A folder
   * doesn't count: a static host answers a folder URL only with its index.html.
   */
  const resolves = async (path: string) => {
    const sitePath = decodeURIComponent(path.slice(basePath.length).replace(/[?#].*$/, ''));
    const candidates =
      sitePath === '' || sitePath.endsWith('/')
        ? [`${sitePath}index.html`]
        : [sitePath, `${sitePath}.html`, `${sitePath}/index.html`];
    for (const candidate of candidates) {
      const file = join(site.dir, 'dist', ...candidate.split('/'));
      if ((await stat(file).catch(() => undefined))?.isFile()) {
        return true;
      }
    }
    return false;
  };

  it.each(TEMPLATE_NAMES)(
    'the %s starter links only files the build wrote, under the base path',
    async (name) => {
      site = await createSiteFixture(vi.mocked(loadConfig));
      await new ExampleManager().copyExample(name, site.dir);
      vi.mocked(loadConfig).mockResolvedValue(await starterConfig(name, baseUrl));

      const { warnings } = await site.build();

      expect(warnings.filter((warning) => warning.includes('base path'))).toEqual([]);
      const files = await htmlFiles();
      expect(files).toContain('index.html');
      const unprefixed: string[] = [];
      const broken: string[] = [];
      // Most links are on every page, so each path is looked up once
      const checked = new Map<string, Promise<boolean>>();
      for (const file of files) {
        for (const path of rootPaths(await site.read(`dist/${file}`))) {
          if (path !== basePath && !path.startsWith(`${basePath}/`)) {
            unprefixed.push(`${file}: ${path}`);
            continue;
          }
          if (!checked.has(path)) {
            checked.set(path, resolves(path));
          }
          if (!(await checked.get(path))) {
            broken.push(`${file}: ${path}`);
          }
        }
      }
      expect(unprefixed).toEqual([]);
      expect(broken).toEqual([]);
    },
    BUILD_TIMEOUT,
  );

  it(
    'links the blank starter hashed stylesheet, icon and home page under the base path',
    async () => {
      site = await createSiteFixture(vi.mocked(loadConfig));
      await new ExampleManager().copyExample('blank', site.dir);
      vi.mocked(loadConfig).mockResolvedValue(await starterConfig('blank', baseUrl));

      await site.build();

      const html = await site.read('dist/index.html');
      const stylesheet = /<link rel="stylesheet" href="([^"]+)"/.exec(html)?.[1];
      expect(stylesheet).toMatch(new RegExp(`^${basePath}/_assets/styles-[A-Za-z0-9]+\\.css$`));
      expect(html).toContain(`<link rel="icon" href="${basePath}/favicon.svg"`);
      expect(html).toContain(`<a href="${basePath}/" class="logo">`);
    },
    BUILD_TIMEOUT,
  );
});
