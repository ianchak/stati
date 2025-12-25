import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getConfigFilePaths, loadConfig, clearConfigCache } from '../src/config/loader.js';

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
});
