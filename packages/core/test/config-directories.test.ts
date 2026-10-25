import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateDirectoryLayout } from '../src/config/directories.js';
import { ConfigValidationError } from '../src/config/errors.js';
import type { StatiConfig } from '../src/types/index.js';

const root = join(tmpdir(), 'stati-directories-project');

function makeConfig(overrides: Partial<StatiConfig> = {}): StatiConfig {
  return {
    srcDir: 'site',
    outDir: 'dist',
    staticDir: 'public',
    site: { title: 'T', baseUrl: 'https://example.com' },
    ...overrides,
  };
}

describe('validateDirectoryLayout', () => {
  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts the default layout', () => {
    expect(() => validateDirectoryLayout(makeConfig())).not.toThrow();
  });

  it('accepts an output folder that is nested or has a sibling-like name', () => {
    expect(() => validateDirectoryLayout(makeConfig({ outDir: 'build/site-out' }))).not.toThrow();
    // Shares a prefix with srcDir and staticDir without being inside either
    expect(() => validateDirectoryLayout(makeConfig({ outDir: 'site-dist' }))).not.toThrow();
    expect(() => validateDirectoryLayout(makeConfig({ outDir: 'public-out' }))).not.toThrow();
  });

  it('accepts an output folder that matches the default folders when the config omits them', () => {
    expect(() =>
      validateDirectoryLayout({ site: { title: 'T', baseUrl: 'https://example.com' } }),
    ).not.toThrow();
  });

  it('rejects an outDir equal to srcDir and names both paths', () => {
    const run = () => validateDirectoryLayout(makeConfig({ outDir: 'site' }));

    expect(run).toThrow(ConfigValidationError);
    expect(run).toThrow(/outDir 'site'/);
    expect(run).toThrow(/is or contains srcDir/);
    expect(run).toThrow(join(root, 'site'));
  });

  it('rejects an outDir with a trailing slash or a ./ prefix that resolves to srcDir', () => {
    expect(() => validateDirectoryLayout(makeConfig({ outDir: './site/' }))).toThrow(
      /is or contains srcDir/,
    );
  });

  it.each([['.'], [''], ['./'], ['..'], ['../..']])(
    'rejects outDir %j, which is the project folder or a parent',
    (outDir) => {
      expect(() => validateDirectoryLayout(makeConfig({ outDir }))).toThrow(
        /project folder or one of its parents/,
      );
    },
  );

  it('rejects an outDir inside srcDir', () => {
    expect(() => validateDirectoryLayout(makeConfig({ outDir: 'site/dist' }))).toThrow(
      /is inside srcDir/,
    );
  });

  it('rejects an outDir equal to or inside staticDir', () => {
    expect(() => validateDirectoryLayout(makeConfig({ outDir: 'public' }))).toThrow(
      /is or contains staticDir/,
    );
    expect(() => validateDirectoryLayout(makeConfig({ outDir: 'public/out' }))).toThrow(
      /is inside staticDir/,
    );
  });

  it('names the output folder and the folder it collides with', () => {
    let message = '';
    try {
      validateDirectoryLayout(makeConfig({ outDir: 'site/dist' }));
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain(join(root, 'site', 'dist'));
    expect(message).toContain(`srcDir (${join(root, 'site')})`);
  });

  it('rejects every outDir when srcDir is the project folder, since the output would sit inside it', () => {
    expect(() => validateDirectoryLayout(makeConfig({ srcDir: '.', outDir: 'dist' }))).toThrow(
      /is inside srcDir/,
    );
  });

  it('rejects an outDir that contains srcDir or staticDir without being the project folder', () => {
    expect(() =>
      validateDirectoryLayout(makeConfig({ srcDir: 'web/site', outDir: 'web' })),
    ).toThrow(/is or contains srcDir/);
    expect(() =>
      validateDirectoryLayout(makeConfig({ staticDir: 'web/public', outDir: 'web' })),
    ).toThrow(/is or contains staticDir/);
  });

  it('rejects an outDir that overlaps the .stati cache folder', () => {
    expect(() => validateDirectoryLayout(makeConfig({ outDir: '.stati' }))).toThrow(
      /is or contains the \.stati cache folder/,
    );
    expect(() => validateDirectoryLayout(makeConfig({ outDir: '.stati/out' }))).toThrow(
      /is inside the \.stati cache folder/,
    );
  });

  it('checks typescript.srcDir only when TypeScript is enabled', () => {
    const outDir = 'src';
    expect(() => validateDirectoryLayout(makeConfig({ outDir }))).not.toThrow();
    expect(() =>
      validateDirectoryLayout(makeConfig({ outDir, typescript: { enabled: false } })),
    ).not.toThrow();
    expect(() =>
      validateDirectoryLayout(makeConfig({ outDir, typescript: { enabled: true } })),
    ).toThrow(/is or contains typescript\.srcDir/);
    expect(() =>
      validateDirectoryLayout(
        makeConfig({ outDir: 'client', typescript: { enabled: true, srcDir: 'client/ts' } }),
      ),
    ).toThrow(/is or contains typescript\.srcDir/);
  });

  it.each([
    ['srcDir', { srcDir: 'dist', outDir: null }, /is or contains srcDir/],
    ['outDir', { srcDir: null, outDir: 'site' }, /is or contains srcDir/],
    ['staticDir', { staticDir: null, outDir: 'public' }, /is or contains staticDir/],
    ['both', { srcDir: null, outDir: null }, null],
  ])('applies the default folder to a null %s', (_, overrides, message) => {
    const config = makeConfig(overrides as unknown as Partial<StatiConfig>);

    if (message) {
      expect(() => validateDirectoryLayout(config)).toThrow(message);
    } else {
      expect(() => validateDirectoryLayout(config)).not.toThrow();
    }
  });

  it('ignores directory options of another type, which other checks report', () => {
    const config = makeConfig({ srcDir: 42 as unknown as string, outDir: 'dist' });
    expect(() => validateDirectoryLayout(config)).not.toThrow();
    expect(() =>
      validateDirectoryLayout(makeConfig({ outDir: ['site'] as unknown as string })),
    ).not.toThrow();
  });

  describe('case-insensitive platforms', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('treats Site and site as one folder on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      expect(() => validateDirectoryLayout(makeConfig({ outDir: 'SITE' }))).toThrow(
        /is or contains srcDir/,
      );
    });

    it('keeps Site and site apart on Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      expect(() => validateDirectoryLayout(makeConfig({ outDir: 'SITE' }))).not.toThrow();
    });
  });
});
