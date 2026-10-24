/**
 * A temporary Stati project for integration tests that build real sites.
 *
 * Tests must mock the config loader themselves (`vi.mock('../../src/config/loader.js')`) and
 * pass the mocked `loadConfig` in, because `vi.mock` only applies to the test file.
 */
import { vi, type MockedFunction } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { build, type BuildResult } from '../../src/core/build.js';
import type { TailwindBuildOptions } from '../../src/css/index.js';
import { loadCacheManifest } from '../../src/core/isg/index.js';
import type { loadConfig } from '../../src/config/loader.js';
import type { CacheManifest, Logger, StatiConfig } from '../../src/types/index.js';

export interface FixtureBuild {
  /** URLs rendered by this build, in render order */
  rendered: string[];
  /** URLs served from the cache */
  cached: string[];
  /** Messages logged as warnings */
  warnings: string[];
  /** Messages logged as info */
  info: string[];
  /** Messages logged as errors; only with `allowErrors`, which otherwise fail the build */
  errors: string[];
  result: BuildResult;
}

export interface SiteFixture {
  dir: string;
  /** Writes a file relative to the project directory */
  write(path: string, content: string): Promise<void>;
  /** Deletes a file relative to the project directory */
  remove(path: string): Promise<void>;
  /** Reads a file relative to the project directory */
  read(path: string): Promise<string>;
  /** Whether a file relative to the project directory exists */
  exists(path: string): Promise<boolean>;
  /**
   * Runs a build and records what it rendered. A logged error fails the build unless
   * `allowErrors` is set, which collects them instead.
   */
  build(options?: {
    force?: boolean;
    includeDrafts?: boolean;
    allowErrors?: boolean;
    tailwind?: TailwindBuildOptions;
  }): Promise<FixtureBuild>;
  /** The ISG cache manifest */
  manifest(): Promise<CacheManifest>;
  /** Writes the ISG cache manifest */
  saveManifest(manifest: CacheManifest): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Creates a project in a temporary directory and points `process.cwd()` at it.
 *
 * @param mockedLoadConfig - The test file's mocked `loadConfig`
 * @param config - Config overrides; srcDir, outDir and staticDir default to site, dist, public
 */
export async function createSiteFixture(
  mockedLoadConfig: MockedFunction<typeof loadConfig>,
  config: Partial<StatiConfig> = {},
): Promise<SiteFixture> {
  const dir = await mkdtemp(join(tmpdir(), 'stati-collections-'));
  vi.spyOn(process, 'cwd').mockReturnValue(dir);

  const fullConfig: StatiConfig = {
    srcDir: 'site',
    outDir: 'dist',
    staticDir: 'public',
    site: { title: 'Fixture', baseUrl: 'https://example.com' },
    isg: { enabled: true, ttlSeconds: 3600 },
    ...config,
  };
  mockedLoadConfig.mockImplementation(async () => fullConfig);
  await mkdir(join(dir, 'site'), { recursive: true });
  await mkdir(join(dir, 'public'), { recursive: true });

  const path = (relativePath: string) => join(dir, ...relativePath.split('/'));

  return {
    dir,
    async write(relativePath, content) {
      await mkdir(dirname(path(relativePath)), { recursive: true });
      await writeFile(path(relativePath), content);
    },
    async remove(relativePath) {
      await rm(path(relativePath), { force: true });
    },
    read: (relativePath) => readFile(path(relativePath), 'utf-8'),
    async exists(relativePath) {
      try {
        await access(path(relativePath));
        return true;
      } catch {
        return false;
      }
    },
    async build({ allowErrors = false, ...options } = {}) {
      const rendered: string[] = [];
      const cached: string[] = [];
      const warnings: string[] = [];
      const info: string[] = [];
      const errors: string[] = [];
      const logger: Logger = {
        info: (message) => info.push(message),
        success: () => {},
        warning: (message) => warnings.push(message),
        error: (message) => {
          if (!allowErrors) {
            throw new Error(`Unexpected build error: ${message}`);
          }
          errors.push(message);
        },
        status: () => {},
        building: () => {},
        processing: () => {},
        stats: () => {},
        updateProgress: (status, url) => {
          (status === 'cached' ? cached : rendered).push(url);
        },
      };
      const result = await build({ logger, ...options });
      return { rendered, cached, warnings, info, errors, result };
    },
    async manifest() {
      const manifest = await loadCacheManifest(join(dir, '.stati'));
      if (!manifest) {
        throw new Error('No cache manifest');
      }
      return manifest;
    },
    async saveManifest(manifest) {
      await writeFile(join(dir, '.stati', 'manifest.json'), JSON.stringify(manifest, null, 2));
    },
    async cleanup() {
      vi.restoreAllMocks();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Front matter and body of a Markdown page.
 */
export function page(frontMatter: Record<string, unknown>, body = ''): string {
  const yaml = Object.entries(frontMatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
  return `---\n${yaml}\n---\n${body}\n`;
}
