import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { resolvePrettyUrl, mergeServerOptions } from '../../src/core/utils/server.utils.js';

describe('mergeServerOptions', () => {
  const defaults = {
    port: 3000,
    host: 'localhost',
    open: false,
  };

  describe('open option precedence', () => {
    it('should use CLI option when explicitly set to true', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: 'localhost', open: true },
        config: { open: false },
        defaults,
      });

      expect(result.open).toBe(true);
    });

    it('should use CLI option when explicitly set to false (--no-open)', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: 'localhost', open: false },
        config: { open: true },
        defaults,
      });

      expect(result.open).toBe(false);
    });

    it('should use config value when CLI option is undefined', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: 'localhost' }, // open is undefined
        config: { open: true },
        defaults,
      });

      expect(result.open).toBe(true);
    });

    it('should use config value false when CLI option is undefined', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: 'localhost' }, // open is undefined
        config: { open: false },
        defaults,
      });

      expect(result.open).toBe(false);
    });

    it('should use default value when both CLI option and config are undefined', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: 'localhost' }, // open is undefined
        config: undefined,
        defaults,
      });

      expect(result.open).toBe(false); // defaults.open is false
    });

    it('should use default value when config exists but open is not set', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: 'localhost' }, // open is undefined
        config: { port: 4000 }, // open is undefined in config
        defaults,
      });

      expect(result.open).toBe(false); // defaults.open is false
    });
  });

  describe('port option precedence', () => {
    it('should use CLI port over config', () => {
      const result = mergeServerOptions({
        options: { port: 8080, host: 'localhost' },
        config: { port: 9000 },
        defaults,
      });

      expect(result.port).toBe(8080);
    });

    it('should use config port when CLI port is undefined', () => {
      const result = mergeServerOptions({
        options: { host: 'localhost' },
        config: { port: 9000 },
        defaults,
      });

      expect(result.port).toBe(9000);
    });

    it('should use default port when neither CLI nor config specify it', () => {
      const result = mergeServerOptions({
        options: { host: 'localhost' },
        config: {},
        defaults,
      });

      expect(result.port).toBe(3000);
    });
  });

  describe('host option precedence', () => {
    it('should use CLI host over config', () => {
      const result = mergeServerOptions({
        options: { port: 3000, host: '0.0.0.0' },
        config: { host: '127.0.0.1' },
        defaults,
      });

      expect(result.host).toBe('0.0.0.0');
    });

    it('should use config host when CLI host is undefined', () => {
      const result = mergeServerOptions({
        options: { port: 3000 },
        config: { host: '127.0.0.1' },
        defaults,
      });

      expect(result.host).toBe('127.0.0.1');
    });

    it('should use default host when neither CLI nor config specify it', () => {
      const result = mergeServerOptions({
        options: { port: 3000 },
        config: {},
        defaults,
      });

      expect(result.host).toBe('localhost');
    });
  });
});

describe('resolvePrettyUrl', () => {
  const testDir = join(process.cwd(), 'test-server-utils');
  const outDir = join(testDir, 'dist');

  beforeAll(async () => {
    // Create test directory structure
    await mkdir(outDir, { recursive: true });
    await mkdir(join(outDir, 'blog'), { recursive: true });

    // Create test files
    await writeFile(join(outDir, 'index.html'), '<h1>Home</h1>');
    await writeFile(join(outDir, 'about.html'), '<h1>About</h1>');
    await writeFile(join(outDir, 'blog', 'index.html'), '<h1>Blog</h1>');
    await writeFile(join(outDir, 'contact.html'), '<h1>Contact</h1>');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should resolve root path to index.html', async () => {
    const result = await resolvePrettyUrl(outDir, '/', join(outDir, 'index.html'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'index.html'));
  });

  it('should resolve existing file directly', async () => {
    const result = await resolvePrettyUrl(outDir, '/about.html', join(outDir, 'about.html'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'about.html'));
  });

  it('should resolve directory to index.html', async () => {
    const result = await resolvePrettyUrl(outDir, '/blog/', join(outDir, 'blog'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'blog', 'index.html'));
  });

  it('should fallback from directory with trailing slash to .html file', async () => {
    const result = await resolvePrettyUrl(outDir, '/contact/', join(outDir, 'contact'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'contact.html'));
  });

  it('should fallback from missing file with trailing slash to .html file', async () => {
    const result = await resolvePrettyUrl(outDir, '/about/', join(outDir, 'about'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'about.html'));
  });

  it('should fallback from path without trailing slash to .html file', async () => {
    const result = await resolvePrettyUrl(outDir, '/about', join(outDir, 'about'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'about.html'));
  });

  it('should fallback from nested path without trailing slash to .html file', async () => {
    const result = await resolvePrettyUrl(outDir, '/contact', join(outDir, 'contact'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'contact.html'));
  });

  it('should return not found for non-existent paths', async () => {
    const result = await resolvePrettyUrl(outDir, '/nonexistent/', join(outDir, 'nonexistent'));

    expect(result.found).toBe(false);
    expect(result.filePath).toBe(null);
  });

  it('should return not found for non-existent files', async () => {
    const result = await resolvePrettyUrl(outDir, '/missing.html', join(outDir, 'missing.html'));

    expect(result.found).toBe(false);
    expect(result.filePath).toBe(null);
  });
});
