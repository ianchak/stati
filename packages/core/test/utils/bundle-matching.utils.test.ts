import { describe, it, expect } from 'vitest';
import {
  matchBundlesForPage,
  getBundlePathsForPage,
  validateUniqueBundleNames,
  DuplicateBundleNameError,
  type CompiledBundleInfo,
} from '../../src/core/utils/bundle-matching.utils.js';
import type { BundleConfig } from '../../src/types/config.js';

describe('matchBundlesForPage', () => {
  describe('global bundles (no include pattern)', () => {
    it('should match all pages when no include pattern is specified', () => {
      const bundles: BundleConfig[] = [{ entryPoint: 'core.ts', bundleName: 'core' }];

      expect(matchBundlesForPage('/index.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/docs/api/hooks.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/blog/2024/post.html', bundles)).toEqual(bundles);
    });

    it('should match all pages when include is an empty array', () => {
      const bundles: BundleConfig[] = [{ entryPoint: 'core.ts', bundleName: 'core', include: [] }];

      expect(matchBundlesForPage('/any/path.html', bundles)).toEqual(bundles);
    });
  });

  describe('include patterns', () => {
    it('should match pages that match include pattern', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
      ];

      expect(matchBundlesForPage('/docs/index.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/docs/api/hooks.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/docs/getting-started/install.html', bundles)).toEqual(bundles);
    });

    it('should not match pages that do not match include pattern', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
      ];

      expect(matchBundlesForPage('/index.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/blog/post.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/about.html', bundles)).toEqual([]);
    });

    it('should match if any include pattern matches', () => {
      const bundles: BundleConfig[] = [
        {
          entryPoint: 'interactive.ts',
          bundleName: 'interactive',
          include: ['/docs/**', '/api/**'],
        },
      ];

      expect(matchBundlesForPage('/docs/guide.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/api/reference.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/blog/post.html', bundles)).toEqual([]);
    });

    it('should match exact paths', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'home.ts', bundleName: 'home', include: ['/index.html', '/'] },
      ];

      expect(matchBundlesForPage('/index.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/about.html', bundles)).toEqual([]);
    });
  });

  describe('exclude patterns (takes precedence)', () => {
    it('should exclude pages matching exclude pattern even if include matches', () => {
      const bundles: BundleConfig[] = [
        {
          entryPoint: 'playground.ts',
          bundleName: 'playground',
          include: ['/examples/**'],
          exclude: ['/examples/simple/**'],
        },
      ];

      expect(matchBundlesForPage('/examples/advanced/demo.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/examples/simple/basic.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/examples/simple/index.html', bundles)).toEqual([]);
    });

    it('should exclude from global bundles when exclude pattern matches', () => {
      const bundles: BundleConfig[] = [
        {
          entryPoint: 'analytics.ts',
          bundleName: 'analytics',
          exclude: ['/admin/**', '/private/**'],
        },
      ];

      expect(matchBundlesForPage('/index.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/docs/guide.html', bundles)).toEqual(bundles);
      expect(matchBundlesForPage('/admin/dashboard.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/private/settings.html', bundles)).toEqual([]);
    });

    it('should handle multiple exclude patterns', () => {
      const bundles: BundleConfig[] = [
        {
          entryPoint: 'core.ts',
          bundleName: 'core',
          exclude: ['/legacy/**', '/deprecated/**', '/internal/**'],
        },
      ];

      expect(matchBundlesForPage('/legacy/old.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/deprecated/v1.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/internal/debug.html', bundles)).toEqual([]);
      expect(matchBundlesForPage('/docs/guide.html', bundles)).toEqual(bundles);
    });
  });

  describe('multiple bundles', () => {
    it('should return correct subset of bundles for each page', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'core.ts', bundleName: 'core' }, // global
        { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
        { entryPoint: 'blog.ts', bundleName: 'blog', include: ['/blog/**'] },
      ];

      const docsResult = matchBundlesForPage('/docs/api/hooks.html', bundles);
      expect(docsResult).toHaveLength(2);
      expect(docsResult[0]!.bundleName).toBe('core');
      expect(docsResult[1]!.bundleName).toBe('docs');

      const blogResult = matchBundlesForPage('/blog/post.html', bundles);
      expect(blogResult).toHaveLength(2);
      expect(blogResult[0]!.bundleName).toBe('core');
      expect(blogResult[1]!.bundleName).toBe('blog');

      const homeResult = matchBundlesForPage('/index.html', bundles);
      expect(homeResult).toHaveLength(1);
      expect(homeResult[0]!.bundleName).toBe('core');
    });

    it('should preserve bundle order from config', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'first.ts', bundleName: 'first' },
        { entryPoint: 'second.ts', bundleName: 'second' },
        { entryPoint: 'third.ts', bundleName: 'third' },
      ];

      const result = matchBundlesForPage('/any/page.html', bundles);
      expect(result).toHaveLength(3);
      expect(result[0]!.bundleName).toBe('first');
      expect(result[1]!.bundleName).toBe('second');
      expect(result[2]!.bundleName).toBe('third');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty bundles array', () => {
      expect(matchBundlesForPage('/any/page.html', [])).toEqual([]);
    });

    it('should return empty array for undefined bundles', () => {
      expect(matchBundlesForPage('/any/page.html', undefined as unknown as BundleConfig[])).toEqual(
        [],
      );
    });

    it('should return empty array when no bundles match', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
        { entryPoint: 'blog.ts', bundleName: 'blog', include: ['/blog/**'] },
      ];

      expect(matchBundlesForPage('/about.html', bundles)).toEqual([]);
    });

    it('should normalize backslashes in page paths', () => {
      const bundles: BundleConfig[] = [
        { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
      ];

      // Windows-style paths should still match
      expect(matchBundlesForPage('\\docs\\api\\hooks.html', bundles)).toEqual(bundles);
    });
  });
});

describe('getBundlePathsForPage', () => {
  it('should return paths for matched bundles', () => {
    const compiled: CompiledBundleInfo[] = [
      {
        config: { entryPoint: 'core.ts', bundleName: 'core' },
        filename: 'core-abc123.js',
        path: '/_assets/core-abc123.js',
      },
      {
        config: { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
        filename: 'docs-def456.js',
        path: '/_assets/docs-def456.js',
      },
    ];

    const paths = getBundlePathsForPage('/docs/api/hooks.html', compiled);
    expect(paths).toEqual(['/_assets/core-abc123.js', '/_assets/docs-def456.js']);
  });

  it('should return only global bundle for non-matching pages', () => {
    const compiled: CompiledBundleInfo[] = [
      {
        config: { entryPoint: 'core.ts', bundleName: 'core' },
        filename: 'core-abc123.js',
        path: '/_assets/core-abc123.js',
      },
      {
        config: { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
        filename: 'docs-def456.js',
        path: '/_assets/docs-def456.js',
      },
    ];

    const paths = getBundlePathsForPage('/about.html', compiled);
    expect(paths).toEqual(['/_assets/core-abc123.js']);
  });

  it('should return empty array for empty compiled bundles', () => {
    expect(getBundlePathsForPage('/any/page.html', [])).toEqual([]);
  });

  it('should return empty array for undefined compiled bundles', () => {
    expect(
      getBundlePathsForPage('/any/page.html', undefined as unknown as CompiledBundleInfo[]),
    ).toEqual([]);
  });

  it('should preserve config order in returned paths', () => {
    const compiled: CompiledBundleInfo[] = [
      {
        config: { entryPoint: 'first.ts', bundleName: 'first' },
        filename: 'first.js',
        path: '/_assets/first.js',
      },
      {
        config: { entryPoint: 'second.ts', bundleName: 'second' },
        filename: 'second.js',
        path: '/_assets/second.js',
      },
      {
        config: { entryPoint: 'third.ts', bundleName: 'third' },
        filename: 'third.js',
        path: '/_assets/third.js',
      },
    ];

    const paths = getBundlePathsForPage('/any/page.html', compiled);
    expect(paths).toEqual(['/_assets/first.js', '/_assets/second.js', '/_assets/third.js']);
  });
});

describe('validateUniqueBundleNames', () => {
  it('should not throw for unique bundleNames', () => {
    const bundles: BundleConfig[] = [
      { entryPoint: 'core.ts', bundleName: 'core' },
      { entryPoint: 'docs.ts', bundleName: 'docs' },
      { entryPoint: 'blog.ts', bundleName: 'blog' },
    ];

    expect(() => validateUniqueBundleNames(bundles)).not.toThrow();
  });

  it('should throw DuplicateBundleNameError for duplicate bundleNames', () => {
    const bundles: BundleConfig[] = [
      { entryPoint: 'core.ts', bundleName: 'main' },
      { entryPoint: 'docs.ts', bundleName: 'docs' },
      { entryPoint: 'other.ts', bundleName: 'main' },
    ];

    expect(() => validateUniqueBundleNames(bundles)).toThrow(DuplicateBundleNameError);
    expect(() => validateUniqueBundleNames(bundles)).toThrow(/main/);
  });

  it('should report all duplicate bundleNames in error message', () => {
    const bundles: BundleConfig[] = [
      { entryPoint: 'a.ts', bundleName: 'main' },
      { entryPoint: 'b.ts', bundleName: 'main' },
      { entryPoint: 'c.ts', bundleName: 'utils' },
      { entryPoint: 'd.ts', bundleName: 'utils' },
    ];

    expect(() => validateUniqueBundleNames(bundles)).toThrow(/main.*utils|utils.*main/);
  });

  it('should not throw for empty bundles array', () => {
    expect(() => validateUniqueBundleNames([])).not.toThrow();
  });

  it('should not throw for undefined bundles', () => {
    expect(() => validateUniqueBundleNames(undefined as unknown as BundleConfig[])).not.toThrow();
  });

  it('should not throw for single bundle', () => {
    const bundles: BundleConfig[] = [{ entryPoint: 'main.ts', bundleName: 'main' }];

    expect(() => validateUniqueBundleNames(bundles)).not.toThrow();
  });
});

describe('matchBundlesForPage duplicate bundleName handling', () => {
  it('should throw when bundles have duplicate bundleNames', () => {
    const bundles: BundleConfig[] = [
      { entryPoint: 'a.ts', bundleName: 'shared' },
      { entryPoint: 'b.ts', bundleName: 'shared' },
    ];

    expect(() => matchBundlesForPage('/any/page.html', bundles)).toThrow(DuplicateBundleNameError);
  });
});

describe('getBundlePathsForPage duplicate bundleName handling', () => {
  it('should throw when compiled bundles have duplicate bundleNames', () => {
    const compiled: CompiledBundleInfo[] = [
      {
        config: { entryPoint: 'a.ts', bundleName: 'shared' },
        filename: 'shared-abc.js',
        path: '/_assets/shared-abc.js',
      },
      {
        config: { entryPoint: 'b.ts', bundleName: 'shared' },
        filename: 'shared-def.js',
        path: '/_assets/shared-def.js',
      },
    ];

    expect(() => getBundlePathsForPage('/any/page.html', compiled)).toThrow(
      DuplicateBundleNameError,
    );
  });
});
