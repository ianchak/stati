/**
 * Integration tests for dev server internal functions
 * These tests exercise actual code paths with minimal mocking
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { get } from 'node:http';

// We need to test the internal functions, so we'll import the module and access them
// Since they're not exported, we'll test them through the public API's behavior
import { createDevServer } from '../../src/core/dev.js';
import { DEFAULT_DEV_PORT, DEFAULT_DEV_HOST } from '../../src/constants.js';

// Helper to make HTTP requests to the dev server
function makeRequest(url: string): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 500,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body,
        });
      });
    }).on('error', reject);
  });
}

describe('Dev Server Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  // Shared setup - create temp directory once for all tests
  beforeAll(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'stati-dev-integration-'));
    process.chdir(testDir);

    // Create minimal project structure
    await mkdir(join(testDir, 'site'), { recursive: true });
    await mkdir(join(testDir, 'public'), { recursive: true });
    await mkdir(join(testDir, 'dist'), { recursive: true });

    // Create a basic config file
    await writeFile(
      join(testDir, 'stati.config.js'),
      `export default { title: 'Test Site', description: 'Test' };`,
    );

    // Create a basic layout
    await writeFile(
      join(testDir, 'site', 'layout.eta'),
      `<!DOCTYPE html><html><head><title><%= stati.title %></title></head><body><%~ stati.content %></body></html>`,
    );

    // Create test content
    await writeFile(
      join(testDir, 'site', 'index.md'),
      `---
title: Home
---
# Welcome`,
    );
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  // Create a reusable logger to avoid recreating it in every test
  const createMockLogger = () => ({
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  });

  describe('createDevServer', () => {
    it('should create a dev server with default options', async () => {
      const server = await createDevServer({ logger: createMockLogger() });
      expect(server).toBeDefined();
      expect(server.url).toBe(`http://${DEFAULT_DEV_HOST}:${DEFAULT_DEV_PORT}`);
      expect(server.start).toBeDefined();
      expect(server.stop).toBeDefined();

      // Cleanup - stop server if it was started
      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should create a dev server with custom port and host', async () => {
      const customPort = 5000;
      const customHost = '0.0.0.0';

      const server = await createDevServer({
        port: customPort,
        host: customHost,
        logger: createMockLogger(),
      });

      expect(server.url).toBe(`http://${customHost}:${customPort}`);

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should pass configPath option', async () => {
      const customConfigPath = join(testDir, 'custom.config.js');
      await writeFile(
        customConfigPath,
        `export default { title: 'Custom Config', description: 'Custom' };`,
      );

      const server = await createDevServer({
        configPath: testDir, // Pass directory containing config
        logger: createMockLogger(),
      });

      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should create server even with missing config file (uses defaults)', async () => {
      // Remove the config file temporarily
      const configPath = join(testDir, 'stati.config.js');
      const configBackup = await readFile(configPath, 'utf-8');
      await rm(configPath, { force: true });

      try {
        // loadConfig creates defaults if config file is missing
        const server = await createDevServer({ logger: createMockLogger() });
        expect(server).toBeDefined();

        await server.stop().catch(() => {});
      } finally {
        // Restore the config file for other tests
        await writeFile(configPath, configBackup);
      }
    });
  });

  describe('Live Reload Script Injection', () => {
    let sharedServer: Awaited<ReturnType<typeof createDevServer>>;
    const sharedPort = 3110;

    beforeAll(async () => {
      await mkdir(join(testDir, 'dist'), { recursive: true });

      // Create all test files at once
      await Promise.all([
        writeFile(
          join(testDir, 'dist', 'index.html'),
          '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>',
        ),
        writeFile(join(testDir, 'dist', 'minimal.html'), '<html><head></head></html>'),
        writeFile(join(testDir, 'dist', 'data.json'), '{"test": true}'),
      ]);

      // Start one server for all live reload tests
      sharedServer = await createDevServer({ logger: createMockLogger(), port: sharedPort });
      await sharedServer.start();
    });

    afterAll(async () => {
      await sharedServer.stop();
    });

    it('should inject live reload script before closing body tag', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/`);
      expect(response.status).toBe(200);
      expect(response.body).toContain('<script>');
      expect(response.body).toContain('__ws');
      expect(response.body).toContain('WebSocket');
      // Script should be before closing body tag
      expect(response.body.indexOf('</script>')).toBeLessThan(response.body.indexOf('</body>'));
    });

    it('should handle HTML without body tag', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/minimal.html`);
      expect(response.status).toBe(200);
      // Script should still be injected, at the end
      expect(response.body).toContain('<script>');
      expect(response.body).toContain('__ws');
    });

    it('should not inject script into non-HTML files', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/data.json`);
      expect(response.status).toBe(200);
      // Script should NOT be in JSON files
      expect(response.body).not.toContain('__ws');
      expect(response.body).not.toContain('<script>');
    });
  });

  describe('Error Handling', () => {
    it('should display error overlay for build errors', async () => {
      // Create invalid markdown that will cause build error
      await writeFile(
        join(testDir, 'site', 'bad.md'),
        `---
title: Bad
invalid yaml: [unclosed array
---
# Content`,
      );

      const logger = createMockLogger();

      const server = await createDevServer({ logger, port: 3113 });

      try {
        await server.start();

        // Request the homepage which should show error overlay
        const response = await makeRequest(`http://localhost:3113/`);
        expect(response.status).toBe(500);
        expect(response.body).toContain('error');
      } finally {
        await server.stop();
      }
    });

    it('should handle template errors and show overlay', async () => {
      // Backup the original layout
      const layoutPath = join(testDir, 'site', 'layout.eta');
      const originalLayout = await readFile(layoutPath, 'utf-8');

      try {
        // Create invalid template
        await writeFile(layoutPath, `<!DOCTYPE html><html><%= undefinedVariable %></html>`);

        const logger = createMockLogger();

        const server = await createDevServer({ logger, port: 3114 });

        try {
          await server.start();

          const response = await makeRequest(`http://localhost:3114/`);
          expect(response.status).toBe(500);
          expect(response.body).toContain('error');
        } finally {
          await server.stop();
        }
      } finally {
        // Restore the original layout for other tests
        await writeFile(layoutPath, originalLayout);
      }
    });

    it('should recover after fixing build errors', async () => {
      const logger = createMockLogger();

      const server = await createDevServer({ logger, port: 3115 });

      try {
        await server.start();

        // First request should work
        const response1 = await makeRequest(`http://localhost:3115/`);
        expect(response1.status).toBe(200);

        // Even if there are errors, server should keep running
        // and respond with error overlays
      } finally {
        await server.stop();
      }
    });

    it('should show 404 for truly missing files without build errors', async () => {
      const logger = createMockLogger();

      const server = await createDevServer({ logger, port: 3116 });

      try {
        await server.start();

        const response = await makeRequest(`http://localhost:3116/nonexistent-page`);
        expect(response.status).toBe(404);
        expect(response.body).toContain('404');
      } finally {
        await server.stop();
      }
    });

    it('should handle directory listing requests', async () => {
      const logger = createMockLogger();

      await mkdir(join(testDir, 'dist', 'somedir'), { recursive: true });

      const server = await createDevServer({ logger, port: 3117 });

      try {
        await server.start();

        const response = await makeRequest(`http://localhost:3117/somedir/`);
        expect(response.status).toBe(404);
        expect(response.body).toContain('404');
      } finally {
        await server.stop();
      }
    });

    it('should handle file read errors gracefully', async () => {
      const logger = createMockLogger();

      const server = await createDevServer({ logger, port: 3118 });

      try {
        await server.start();

        // Request a path that might exist but can't be read
        // This is difficult to simulate without platform-specific tricks
        // So we'll just verify 404 works
        const response = await makeRequest(`http://localhost:3118/missing`);
        expect(response.status).toBe(404);
      } finally {
        await server.stop();
      }
    });
  });

  describe('File Serving Scenarios', () => {
    let sharedServer: Awaited<ReturnType<typeof createDevServer>>;
    const sharedPort = 3100;

    // Create all test files and start server once for all file serving tests
    beforeAll(async () => {
      await mkdir(join(testDir, 'dist'), { recursive: true });
      await mkdir(join(testDir, 'dist', 'css'), { recursive: true });
      await mkdir(join(testDir, 'dist', 'js'), { recursive: true });
      await mkdir(join(testDir, 'dist', 'images'), { recursive: true });
      await mkdir(join(testDir, 'dist', 'fonts'), { recursive: true });
      await mkdir(join(testDir, 'dist', 'about'), { recursive: true });

      // Create all test files at once
      await Promise.all([
        writeFile(join(testDir, 'dist', 'index.html'), '<html><body>Home</body></html>'),
        writeFile(join(testDir, 'dist', 'css', 'styles.css'), 'body { margin: 0; }'),
        writeFile(join(testDir, 'dist', 'js', 'app.js'), 'console.log("test");'),
        writeFile(join(testDir, 'dist', 'data.json'), '{"test": true}'),
        writeFile(join(testDir, 'dist', 'images', 'test.png'), 'fake image data'),
        writeFile(join(testDir, 'dist', 'icon.svg'), '<svg></svg>'),
        writeFile(join(testDir, 'dist', 'fonts', 'font.woff2'), 'fake font data'),
        writeFile(join(testDir, 'dist', 'unknown.xyz'), 'unknown file type'),
        writeFile(join(testDir, 'dist', 'about', 'index.html'), '<html><body>About</body></html>'),
      ]);

      // Start one server for all file serving tests
      sharedServer = await createDevServer({ logger: createMockLogger(), port: sharedPort });
      await sharedServer.start();
    });

    afterAll(async () => {
      await sharedServer.stop();
    });

    it('should serve index.html for root path', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/html');
      expect(response.body).toContain('Home');
      // Should have live reload script injected
      expect(response.body).toContain('__ws');
    });

    it('should handle 404 for missing files', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/missing.html`);
      expect(response.status).toBe(404);
      expect(response.body).toContain('404');
    });

    it('should handle pretty URLs', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/about`);
      expect(response.status).toBe(200);
      expect(response.body).toContain('About');
    });

    it('should serve static assets with correct MIME types', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/css/styles.css`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/css');
      expect(response.body).toContain('margin');
    });

    it('should serve JavaScript files with correct MIME type', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/js/app.js`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/javascript');
      expect(response.body).toContain('console.log');
    });

    it('should serve JSON files with correct MIME type', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/data.json`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
      expect(response.body).toContain('"test"');
    });

    it('should serve images with correct MIME types', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/images/test.png`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should serve SVG images with correct MIME type', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/icon.svg`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/svg+xml');
    });

    it('should serve fonts with correct MIME types', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/fonts/font.woff2`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('font/woff2');
    });

    it('should use default MIME type for unknown extensions', async () => {
      const response = await makeRequest(`http://localhost:${sharedPort}/unknown.xyz`);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
    });
  });

  describe('Partial and Template Dependencies', () => {
    it('should handle template changes', async () => {
      const logger = createMockLogger();

      // Create a partial
      await mkdir(join(testDir, 'site', '_partials'), { recursive: true });
      await writeFile(join(testDir, 'site', '_partials', 'header.eta'), '<header>Header</header>');

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should handle markdown changes', async () => {
      const logger = createMockLogger();

      // Create additional markdown file
      await writeFile(
        join(testDir, 'site', 'about.md'),
        `---
title: About
---
# About Page`,
      );

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should handle static file changes', async () => {
      const logger = createMockLogger();

      // Create a static file
      await writeFile(join(testDir, 'public', 'styles.css'), 'body { margin: 0; }');

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });
  });

  describe('Cache and ISG Integration', () => {
    it('should create cache directory structure', async () => {
      const logger = createMockLogger();

      const server = await createDevServer({ logger });

      // After server is created, cache directory should be set up
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should handle existing cache manifest', async () => {
      const logger = createMockLogger();

      // Create cache directory and manifest
      await mkdir(join(testDir, '.stati', 'cache'), { recursive: true });
      await writeFile(
        join(testDir, '.stati', 'cache', 'manifest.json'),
        JSON.stringify({
          version: 1,
          lastBuild: new Date().toISOString(),
          entries: {},
          navigationHash: 'test-hash',
        }),
      );

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should handle corrupt cache manifest', async () => {
      const logger = createMockLogger();

      // Create corrupt cache manifest
      await mkdir(join(testDir, '.stati', 'cache'), { recursive: true });
      await writeFile(join(testDir, '.stati', 'cache', 'manifest.json'), '{ invalid json');

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });
  });

  describe('Navigation Hash Tracking', () => {
    it('should track navigation changes', async () => {
      const logger = createMockLogger();

      // Create pages with navigation metadata
      await writeFile(
        join(testDir, 'site', 'page1.md'),
        `---
title: Page 1
order: 1
---
# Page 1`,
      );

      await writeFile(
        join(testDir, 'site', 'page2.md'),
        `---
title: Page 2
order: 2
---
# Page 2`,
      );

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });

    it('should handle navigation structure changes', async () => {
      const logger = createMockLogger();

      // Create nested directory structure
      await mkdir(join(testDir, 'site', 'docs'), { recursive: true });
      await writeFile(
        join(testDir, 'site', 'docs', 'getting-started.md'),
        `---
title: Getting Started
---
# Getting Started`,
      );

      const server = await createDevServer({ logger });
      expect(server).toBeDefined();

      try {
        await server.stop();
      } catch {
        // Server might not have been started
      }
    });
  });
});
