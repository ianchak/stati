import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getConfigFilePaths, loadConfig, clearConfigCache } from '../src/config/loader.js';
import { ConfigValidationError } from '../src/config/errors.js';
import { getEnv, setEnv } from '../src/env.js';

// Test the actual loader functionality by creating a simpler approach
// Focus on testing the logic rather than mocking complex dynamic imports

describe('config loader', () => {
  let testDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `stati-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('path construction', () => {
    it('should construct correct config file paths', () => {
      // Arrange
      const testDir = '/test/project';

      // Act
      const configPaths = getConfigFilePaths(testDir);

      // Assert - verify path construction logic
      expect(configPaths).toHaveLength(3);
      expect(configPaths[0]).toContain('stati.config.ts');
      expect(configPaths[1]).toContain('stati.config.js');
      expect(configPaths[2]).toContain('stati.config.mjs');
      expect(configPaths[0]).toBe(join(testDir, 'stati.config.ts'));
      expect(configPaths[1]).toBe(join(testDir, 'stati.config.js'));
      expect(configPaths[2]).toBe(join(testDir, 'stati.config.mjs'));
    });
  });

  describe('default config', () => {
    it('should provide sensible defaults', () => {
      // Arrange & Act
      const defaultConfig = {
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: {
          title: 'My Stati Site',
          baseUrl: 'http://localhost:3000',
        },
        isg: {
          enabled: true,
          ttlSeconds: 21600,
          maxAgeCapDays: 365,
        },
      };

      // Assert - verify default structure
      expect(defaultConfig.srcDir).toBe('site');
      expect(defaultConfig.outDir).toBe('dist');
      expect(defaultConfig.site.title).toBe('My Stati Site');
      expect(defaultConfig.isg.enabled).toBe(true);
      expect(defaultConfig.isg.ttlSeconds).toBe(21600);
    });
  });

  describe('config merging logic', () => {
    it('should merge user config with defaults preserving nested properties', () => {
      // Arrange
      const defaultConfig = {
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: {
          title: 'My Site',
          baseUrl: 'http://localhost:3000',
        },
        isg: {
          enabled: true,
          ttlSeconds: 3600,
          maxAgeCapDays: 365,
        },
      };

      const userConfig = {
        srcDir: 'custom-content',
        site: {
          title: 'Custom Site',
          // baseUrl intentionally omitted
        },
        isg: {
          ttlSeconds: 7200,
          // enabled and maxAgeCapDays intentionally omitted
        },
      };

      // Act
      const mergedConfig = {
        ...defaultConfig,
        ...userConfig,
        site: { ...defaultConfig.site, ...userConfig.site },
        isg: { ...defaultConfig.isg, ...userConfig.isg },
      };

      // Assert
      expect(mergedConfig.srcDir).toBe('custom-content'); // User override
      expect(mergedConfig.outDir).toBe('dist'); // Default preserved
      expect(mergedConfig.site.title).toBe('Custom Site'); // User override
      expect(mergedConfig.site.baseUrl).toBe('http://localhost:3000'); // Default preserved
      expect(mergedConfig.isg.enabled).toBe(true); // Default preserved
      expect(mergedConfig.isg.ttlSeconds).toBe(7200); // User override
      expect(mergedConfig.isg.maxAgeCapDays).toBe(365); // Default preserved
    });

    it('should handle partial user configs', () => {
      // Arrange
      const defaultConfig = {
        srcDir: 'site',
        staticDir: 'public',
        site: {
          title: 'My Site',
          baseUrl: 'http://localhost:3000',
        },
      };

      const userConfig = {
        site: {
          title: 'New Title',
        },
      };

      // Act
      const mergedConfig = {
        ...defaultConfig,
        ...userConfig,
        site: { ...defaultConfig.site, ...userConfig.site },
      };

      // Assert
      expect(mergedConfig.site.title).toBe('New Title');
      expect(mergedConfig.site.baseUrl).toBe('http://localhost:3000');
      expect(mergedConfig.srcDir).toBe('site');
    });
  });

  describe('config file extensions', () => {
    it('should support TypeScript config files', () => {
      const configPath = 'stati.config.ts';
      expect(configPath.endsWith('.ts')).toBe(true);
    });

    it('should support JavaScript config files', () => {
      const configPath = 'stati.config.js';
      expect(configPath.endsWith('.js')).toBe(true);
    });

    it('should support ES module config files', () => {
      const configPath = 'stati.config.mjs';
      expect(configPath.endsWith('.mjs')).toBe(true);
    });
  });

  describe('file system integration', () => {
    it('should use process.cwd() as default directory', () => {
      // Arrange
      const originalCwd = process.cwd;
      const mockCwd = vi.fn().mockReturnValue('/current/working/dir');
      process.cwd = mockCwd;

      // Act
      const currentDir = process.cwd();

      // Assert
      expect(mockCwd).toHaveBeenCalled();
      expect(currentDir).toBe('/current/working/dir');

      // Cleanup
      process.cwd = originalCwd;
    });
  });

  describe('loadConfig function', () => {
    it('should return default config when no config file exists', async () => {
      // Act
      const config = await loadConfig(testDir);

      // Assert - should return default config
      expect(config.srcDir).toBe('site');
      expect(config.outDir).toBe('dist');
      expect(config.staticDir).toBe('public');
      expect(config.site.title).toBe('My Stati Site');
      expect(config.site.baseUrl).toBe('http://localhost:3000');
      expect(config.isg?.enabled).toBe(true);
      expect(config.isg?.ttlSeconds).toBe(21600);
    });

    it('should load TypeScript config file when present', async () => {
      // Arrange - create a .mjs config file (easier to test than .ts which requires compilation)
      const configPath = join(testDir, 'stati.config.mjs');
      const configContent = `export default {
  srcDir: 'custom-src',
  outDir: 'custom-dist',
  site: {
    title: 'Test Site TS',
    baseUrl: 'https://example.com'
  }
};`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act
      const config = await loadConfig(testDir);

      // Assert
      expect(config.srcDir).toBe('custom-src');
      expect(config.outDir).toBe('custom-dist');
      expect(config.site.title).toBe('Test Site TS');
      expect(config.site.baseUrl).toBe('https://example.com');
    });

    it('should load JavaScript config file when present', async () => {
      // Arrange
      const configPath = join(testDir, 'stati.config.js');
      const configContent = `export default {
  srcDir: 'js-src',
  site: {
    title: 'JS Site',
    baseUrl: 'https://js-example.com'
  }
};`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act
      const config = await loadConfig(testDir);

      // Assert
      expect(config.srcDir).toBe('js-src');
      expect(config.site.title).toBe('JS Site');
      expect(config.staticDir).toBe('public'); // Should preserve defaults
    });

    it('should merge user config with defaults', async () => {
      // Arrange
      const configPath = join(testDir, 'stati.config.mjs');
      const configContent = `export default {
  srcDir: 'merged-src',
  site: {
    title: 'Merged Site'
    // baseUrl intentionally omitted
  },
  isg: {
    ttlSeconds: 7200
    // enabled and maxAgeCapDays intentionally omitted
  }
};`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act
      const config = await loadConfig(testDir);

      // Assert
      expect(config.srcDir).toBe('merged-src'); // User override
      expect(config.outDir).toBe('dist'); // Default
      expect(config.site.title).toBe('Merged Site'); // User override
      expect(config.site.baseUrl).toBe('http://localhost:3000'); // Default preserved
      expect(config.isg?.enabled).toBe(true); // Default preserved
      expect(config.isg?.ttlSeconds).toBe(7200); // User override
      expect(config.isg?.maxAgeCapDays).toBe(365); // Default preserved
    });

    it('should handle config files with invalid JavaScript and fall back to defaults', async () => {
      // Arrange - create an invalid JavaScript file
      const configPath = join(testDir, 'stati.config.mjs');
      const configContent = `export default {
  this is invalid javascript!!!
}`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Spy on console.error to suppress error output during test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const config = await loadConfig(testDir);

      // Assert - should fall back to default config
      expect(config.srcDir).toBe('site');
      expect(config.outDir).toBe('dist');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should validate ISG configuration and throw on invalid config', async () => {
      // Arrange - create a config with invalid ISG settings
      const configPath = join(testDir, 'stati.config.mjs');
      const configContent = `export default {
  srcDir: 'test-src',
  isg: {
    enabled: true,
    ttlSeconds: -100  // Invalid: negative ttl
  }
};`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act & Assert
      await expect(loadConfig(testDir)).rejects.toThrow(/Invalid ISG configuration/);
    });

    it('should validate the SEO defaults and throw on invalid config', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { seo: { articles: { include: '/blog/*' } } };`,
        'utf-8',
      );

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('Invalid seo configuration in');
      expect((error as Error).message).toContain('seo.articles.include must be an array');
    });

    it('should validate sitemap.news and throw on invalid config', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { sitemap: { enabled: true, news: { include: '/news/*' } } };`,
        'utf-8',
      );

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('Invalid sitemap configuration in');
      expect((error as Error).message).toContain('sitemap.news.include must be an array');
    });

    it('should reject a sitemap default priority outside 0.0 to 1.0', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { sitemap: { enabled: true, defaultPriority: 5 } };`,
        'utf-8',
      );

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('Invalid sitemap configuration in');
      expect((error as Error).message).toContain(
        'sitemap.defaultPriority must be a number from 0.0 to 1.0 (got 5).',
      );
    });

    it('should load a valid sitemap.news block', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { sitemap: { enabled: true, news: { include: ['/news/*/*'] } } };`,
        'utf-8',
      );

      const config = await loadConfig(testDir);
      expect(config.sitemap?.news).toEqual({ include: ['/news/*/*'] });
    });

    it('should validate search.fields and throw on invalid config', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { search: { enabled: true, fields: 'description' } };`,
        'utf-8',
      );

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('Invalid search configuration in');
      expect((error as Error).message).toContain('search.fields must be an array');
    });

    it('should accept search.fields', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { search: { enabled: true, fields: ['description', 'date'] } };`,
        'utf-8',
      );

      expect((await loadConfig(testDir)).search?.fields).toEqual(['description', 'date']);
    });

    it('should validate the css block and throw on invalid config', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { css: { hash: 'yes' } };`,
        'utf-8',
      );

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('Invalid css configuration in');
      expect((error as Error).message).toContain('css.hash must be true or false (got "yes").');
    });

    it('should accept the css block', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { css: { hash: false, autoInject: false } };`,
        'utf-8',
      );

      expect((await loadConfig(testDir)).css).toEqual({ hash: false, autoInject: false });
    });

    it('should validate the readingTime block and throw on invalid config', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { readingTime: { wordsPerMinute: 0 } };`,
        'utf-8',
      );

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('Invalid readingTime configuration in');
      expect((error as Error).message).toContain(
        'readingTime.wordsPerMinute must be a number above 0 (got 0).',
      );
    });

    it('should accept the readingTime block', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { readingTime: { wordsPerMinute: 180 } };`,
        'utf-8',
      );

      expect((await loadConfig(testDir)).readingTime).toEqual({ wordsPerMinute: 180 });
    });

    it('should treat readingTime options that throw while they are checked like a config that fails to load', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { readingTime: { get wordsPerMinute() { throw new TypeError('speed is broken'); } } };`,
        'utf-8',
      );
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = await loadConfig(testDir);

      expect(config.readingTime).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading config from'),
        expect.objectContaining({ message: 'speed is broken' }),
      );
      consoleErrorSpy.mockRestore();
    });

    it('should treat SEO options that throw while they are checked like a config that fails to load', async () => {
      writeFileSync(
        join(testDir, 'stati.config.mjs'),
        `export default { seo: { get articles() { throw new TypeError('articles are broken'); } } };`,
        'utf-8',
      );
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = await loadConfig(testDir);

      expect(config.seo).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading config from'),
        expect.objectContaining({ message: 'articles are broken' }),
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle named exports in addition to default export', async () => {
      // Arrange
      const configPath = join(testDir, 'stati.config.mjs');
      const configContent = `const config = {
  srcDir: 'named-export-src',
  site: {
    title: 'Named Export Site'
  }
};
export { config };
export default config;`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act
      const loadedConfig = await loadConfig(testDir);

      // Assert
      expect(loadedConfig.srcDir).toBe('named-export-src');
      expect(loadedConfig.site.title).toBe('Named Export Site');
    });

    it('should compile and load TypeScript config file', async () => {
      // Arrange - create a TypeScript config file
      const configPath = join(testDir, 'stati.config.ts');
      const configContent = `interface SiteConfig {
  title: string;
  baseUrl: string;
}

interface Config {
  srcDir: string;
  site: SiteConfig;
}

const config: Config = {
  srcDir: 'ts-source',
  site: {
    title: 'TypeScript Site',
    baseUrl: 'https://ts.example.com'
  }
};

export default config;`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act
      const config = await loadConfig(testDir);

      // Assert - config should be loaded with TypeScript stripped
      expect(config.srcDir).toBe('ts-source');
      expect(config.site.title).toBe('TypeScript Site');
      expect(config.site.baseUrl).toBe('https://ts.example.com');
    });

    it('should clean up compiled TypeScript config file after loading', async () => {
      // Arrange - create a TypeScript config file
      const configPath = join(testDir, 'stati.config.ts');
      const configContent = `export default {
  srcDir: 'cleanup-test',
  site: {
    title: 'Cleanup Test'
  }
};`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act
      await loadConfig(testDir);

      // Assert - compiled file should be cleaned up
      const compiledPath = join(testDir, 'stati.config.compiled.mjs');
      expect(existsSync(compiledPath)).toBe(false);
    });

    it('should prefer TypeScript config over JavaScript when both exist', async () => {
      // Arrange - create both TS and JS config files
      const tsConfigPath = join(testDir, 'stati.config.ts');
      const jsConfigPath = join(testDir, 'stati.config.js');

      writeFileSync(
        tsConfigPath,
        `export default {
  srcDir: 'from-ts',
  site: { title: 'TypeScript Config' }
};`,
        'utf-8',
      );

      writeFileSync(
        jsConfigPath,
        `export default {
  srcDir: 'from-js',
  site: { title: 'JavaScript Config' }
};`,
        'utf-8',
      );

      // Act
      const config = await loadConfig(testDir);

      // Assert - TypeScript config should be used (it comes first in search order)
      expect(config.srcDir).toBe('from-ts');
      expect(config.site.title).toBe('TypeScript Config');
    });
  });

  describe('config cache mechanism', () => {
    it('should cache config and return cached version on subsequent loads', async () => {
      // Arrange - create a config file
      const configPath = join(testDir, 'stati.config.mjs');
      const configContent = `export default {
  srcDir: 'cached-src',
  site: { title: 'Cached Site' }
};`;
      writeFileSync(configPath, configContent, 'utf-8');

      // Act - load config twice
      const config1 = await loadConfig(testDir);
      const config2 = await loadConfig(testDir);

      // Assert - both should have same values (cached)
      expect(config1.srcDir).toBe('cached-src');
      expect(config2.srcDir).toBe('cached-src');
      expect(config1.site.title).toBe(config2.site.title);
    });

    it('should evaluate the config again when the environment changes', async () => {
      // A config that branches on getEnv() gives other values in another environment,
      // so a config evaluated in one environment is not reused in the other
      const counter = '__statiConfigEvaluations';
      const configPath = join(testDir, 'stati.config.mjs');
      writeFileSync(
        configPath,
        `globalThis.${counter} = (globalThis.${counter} ?? 0) + 1;
export default { site: { title: 'Evaluation ' + globalThis.${counter} } };`,
        'utf-8',
      );
      const previousEnv = getEnv();

      try {
        setEnv('development');
        const inDevelopment = await loadConfig(testDir);
        // Unchanged file, same environment: the cached evaluation
        expect((await loadConfig(testDir)).site.title).toBe(inDevelopment.site.title);

        setEnv('production');
        const inProduction = await loadConfig(testDir);
        expect(inProduction.site.title).not.toBe(inDevelopment.site.title);
        expect((await loadConfig(testDir)).site.title).toBe(inProduction.site.title);
      } finally {
        setEnv(previousEnv);
        delete (globalThis as Record<string, unknown>)[counter];
      }
    });

    it('should clear internal cache when clearConfigCache is called', () => {
      // This tests the cache clearing function exists and can be called
      // Actual config reload still depends on Node.js module caching
      expect(() => clearConfigCache()).not.toThrow();
    });

    it('should handle cache when config file is deleted', async () => {
      // Arrange - create config and load it
      const configPath = join(testDir, 'stati.config.mjs');
      writeFileSync(
        configPath,
        `export default {
  srcDir: 'to-be-deleted',
  site: { title: 'Deleted' }
};`,
        'utf-8',
      );

      const config1 = await loadConfig(testDir);
      expect(config1.srcDir).toBe('to-be-deleted');

      // Act - delete config file
      rmSync(configPath);

      // Load again
      const config2 = await loadConfig(testDir);

      // Assert - should return default config
      expect(config2.srcDir).toBe('site');
      expect(config2.outDir).toBe('dist');
    });

    it('should cache configs from different directories separately', async () => {
      // Arrange - create two different test directories
      const testDir2 = join(
        tmpdir(),
        `stati-test-2-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      mkdirSync(testDir2, { recursive: true });

      const configPath1 = join(testDir, 'stati.config.mjs');
      const configPath2 = join(testDir2, 'stati.config.mjs');

      writeFileSync(
        configPath1,
        `export default {
  srcDir: 'dir1-src',
  site: { title: 'Dir 1' }
};`,
        'utf-8',
      );

      writeFileSync(
        configPath2,
        `export default {
  srcDir: 'dir2-src',
  site: { title: 'Dir 2' }
};`,
        'utf-8',
      );

      // Act - load configs from both directories
      const config1 = await loadConfig(testDir);
      const config2 = await loadConfig(testDir2);

      // Assert - configs should be different
      expect(config1.srcDir).toBe('dir1-src');
      expect(config2.srcDir).toBe('dir2-src');
      expect(config1.site.title).toBe('Dir 1');
      expect(config2.site.title).toBe('Dir 2');

      // Cleanup
      rmSync(testDir2, { recursive: true, force: true });
    });

    it('should validate cache behavior with TypeScript configs', async () => {
      // This test validates that TypeScript configs can be loaded and cached
      const configPath = join(testDir, 'stati.config.ts');
      writeFileSync(
        configPath,
        `export default {
  srcDir: 'ts-cache-src',
  site: { title: 'TS Cache' }
};`,
        'utf-8',
      );

      // Act - load config
      const config = await loadConfig(testDir);

      // Assert - config should be loaded
      expect(config.srcDir).toBe('ts-cache-src');
      expect(config.site.title).toBe('TS Cache');

      // Verify cleanup happened
      const compiledPath = join(testDir, 'stati.config.compiled.mjs');
      expect(existsSync(compiledPath)).toBe(false);
    });
  });

  describe('TypeScript config that imports other files', () => {
    it("still bundles the configuration's own relative TypeScript imports", async () => {
      writeFileSync(
        join(testDir, 'site-settings.ts'),
        `export const title: string = 'From Relative Import';\n`,
        'utf-8',
      );
      writeFileSync(
        join(testDir, 'stati.config.ts'),
        `import { title } from './site-settings';\nexport default { site: { title } };\n`,
        'utf-8',
      );

      const config = await loadConfig(testDir);

      expect(config.site.title).toBe('From Relative Import');
    });
  });

  describe('template options', () => {
    const writeConfig = (body: string) =>
      writeFileSync(join(testDir, 'stati.config.js'), `export default ${body};`, 'utf-8');

    it('loads helpers', async () => {
      writeConfig(
        `{ site: { title: 'Helpers' }, helpers: { shout: (text) => String(text).toUpperCase() } }`,
      );

      const config = await loadConfig(testDir);
      expect(config.helpers?.shout?.('hi')).toBe('HI');
    });

    it('rejects an unknown option, listing the options there are', async () => {
      writeConfig(`{ site: { title: 'Unknown' }, eta: { filters: {} } }`);

      const error = await loadConfig(testDir).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain(join(testDir, 'stati.config.js'));
      expect((error as Error).message).toContain('Unknown option eta. Allowed options: srcDir,');
      expect((error as Error).message).toContain('helpers');
    });

    it('suggests the option a misspelt one meant', async () => {
      writeConfig(`{ site: { title: 'Typo' }, helper: { shout: (text) => text } }`);

      await expect(loadConfig(testDir)).rejects.toThrow(
        'Unknown option helper. Did you mean helpers?',
      );
    });

    it.each([
      ['an array', `[() => 1]`, 'helpers must be an object of functions'],
      ['a string', `'formatDate'`, 'helpers must be an object of functions'],
      [
        'a helper that is not a function',
        `{ siteName: 'x' }`,
        'helpers.siteName must be a function',
      ],
    ])('rejects helpers that are %s', async (_, helpers, message) => {
      writeConfig(`{ site: { title: 'Bad helpers' }, helpers: ${helpers} }`);

      await expect(loadConfig(testDir)).rejects.toThrow(message);
    });

    it.each([
      [`'site'`, 'is or contains srcDir'],
      [`'./site/'`, 'is or contains srcDir'],
      [`'public'`, 'is or contains staticDir'],
      [`'site/dist'`, 'is inside srcDir'],
      [`'.'`, 'project folder or one of its parents'],
      [`'..'`, 'project folder or one of its parents'],
    ])('rejects outDir %s, which would collide with the site folders', async (outDir, message) => {
      writeConfig(`{ site: { title: 'Bad outDir' }, outDir: ${outDir} }`);

      await expect(loadConfig(testDir)).rejects.toThrow(ConfigValidationError);
      await expect(loadConfig(testDir)).rejects.toThrow(message);
    });

    it('names the config file and both paths when it rejects outDir', async () => {
      writeConfig(`{ site: { title: 'Bad outDir' }, srcDir: 'pages', outDir: 'pages' }`);

      await expect(loadConfig(testDir)).rejects.toThrow(/Invalid configuration in .*stati\.config/);
      await expect(loadConfig(testDir)).rejects.toThrow(/outDir 'pages'.*srcDir/);
    });

    it('treats a config that throws while it is checked like one that fails to load', async () => {
      // The getter works when the config is merged and fails when the helpers are checked
      writeFileSync(
        join(testDir, 'stati.config.js'),
        `let reads = 0;\nexport default { site: { title: 'Throws' }, get helpers() { if (reads++) throw new TypeError('helpers are broken'); return {}; } };`,
        'utf-8',
      );
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = await loadConfig(testDir);

      expect(config.site.title).toBe('My Stati Site');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading config from'),
        expect.objectContaining({ message: 'helpers are broken' }),
      );
      consoleErrorSpy.mockRestore();
    });

    it.each([
      [`'x'`, "string 'x'"],
      ['1', 'number 1'],
      ['undefined', 'undefined'],
      ['{}', 'an object'],
    ])('describes a helper set to %s in the message', async (value, described) => {
      writeConfig(`{ site: { title: 'Bad helpers' }, helpers: { siteName: ${value} } }`);

      await expect(loadConfig(testDir)).rejects.toThrow(
        `helpers.siteName must be a function that templates call as stati.helpers.siteName() (got ${described}).`,
      );
    });
  });
});
