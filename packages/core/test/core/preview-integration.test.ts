/**
 * Integration tests for the preview server: real files, real HTTP requests.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import { createPreviewServer, type PreviewServer } from '../../src/core/preview.js';
import type { Logger } from '../../src/types/index.js';

const port = 4130;

/**
 * Sends a GET request with the path exactly as given; URL-based clients would normalize `..`.
 */
function get(path: string): Promise<{ status: number; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    request({ host: 'localhost', port, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, type: res.headers['content-type'] ?? '', body }),
      );
    })
      .on('error', reject)
      .end();
  });
}

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

describe('Preview Server Integration Tests', () => {
  let projectDir: string;
  let originalCwd: string;
  let server: PreviewServer;

  beforeAll(async () => {
    originalCwd = process.cwd();
    projectDir = await mkdtemp(join(tmpdir(), 'stati-preview-integration-'));
    const dist = join(projectDir, 'dist');
    await mkdir(join(dist, 'blog'), { recursive: true });
    await writeFile(
      join(projectDir, 'stati.config.js'),
      `export default { site: { title: 'Preview', baseUrl: 'https://example.com' } };`,
    );
    await Promise.all([
      writeFile(join(dist, 'index.html'), '<html><body>Home</body></html>'),
      writeFile(join(dist, 'blog.html'), '<html><body>Blog</body></html>'),
      writeFile(join(dist, '404.html'), '<html><body>Custom not found</body></html>'),
      writeFile(join(dist, 'module.mjs'), 'export const answer = 42;'),
      writeFile(join(dist, 'photo.avif'), 'fake avif data'),
      writeFile(join(dist, 'sitemap.xml'), '<?xml version="1.0"?><urlset/>'),
      writeFile(join(dist, 'robots.txt'), 'User-agent: *'),
      writeFile(join(dist, 'my file.txt'), 'spaced name'),
      // Outside the output directory
      writeFile(join(projectDir, 'secret.txt'), 'secret'),
    ]);

    process.chdir(projectDir);
    server = await createPreviewServer({ port, logger });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    process.chdir(originalCwd);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('should serve the site 404 page with a 404 status and no live reload', async () => {
    const response = await get('/no-such-page');
    expect(response).toMatchObject({ status: 404, type: 'text/html' });
    expect(response.body).toContain('Custom not found');
    expect(response.body).not.toContain('__ws');
  });

  it.each([
    ['/module.mjs', 'application/javascript'],
    ['/photo.avif', 'image/avif'],
    ['/sitemap.xml', 'application/xml'],
    ['/robots.txt', 'text/plain'],
  ])('should serve %s as %s', async (path, type) => {
    expect(await get(path)).toMatchObject({ status: 200, type });
  });

  it('should ignore query strings and decode escaped file names', async () => {
    expect(await get('/?utm_source=feed')).toMatchObject({
      status: 200,
      body: expect.stringContaining('Home'),
    });
    expect(await get('/blog/?ref=nav')).toMatchObject({
      status: 200,
      body: expect.stringContaining('Blog'),
    });
    expect(await get('/my%20file.txt')).toMatchObject({ status: 200, body: 'spaced name' });
  });

  it('should reject malformed URLs with 400', async () => {
    expect(await get('/bad%E0%A4%A')).toMatchObject({ status: 400, body: '400 - Bad Request' });
  });

  it('should not serve files outside the output directory', async () => {
    expect(await get('/../secret.txt')).toMatchObject({ status: 403 });
    expect(await get('/%2e%2e/secret.txt')).toMatchObject({ status: 403 });
  });
});

describe('Preview Server without index.html', () => {
  let projectDir: string;
  let originalCwd: string;
  let server: PreviewServer;

  beforeAll(async () => {
    originalCwd = process.cwd();
    projectDir = await mkdtemp(join(tmpdir(), 'stati-preview-no-index-'));
    await mkdir(join(projectDir, 'dist'));
    await writeFile(
      join(projectDir, 'stati.config.js'),
      `export default { site: { title: 'Preview', baseUrl: 'https://example.com' } };`,
    );
    // Named like the .html sibling of the output directory
    await writeFile(join(projectDir, 'dist.html'), 'outside the output directory');

    process.chdir(projectDir);
    server = await createPreviewServer({ port, logger });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    process.chdir(originalCwd);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('should not serve the .html sibling of the output directory', async () => {
    for (const path of ['/../dist', '/%2e%2e/dist']) {
      const response = await get(path);
      expect(response.status).toBe(404);
      expect(response.body).not.toContain('outside the output directory');
    }
  });
});
