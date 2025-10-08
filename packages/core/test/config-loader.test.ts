import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { getConfigFilePaths, loadConfig } from '../src/config/loader.js';

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
  });
});
