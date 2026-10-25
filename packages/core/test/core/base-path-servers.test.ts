/**
 * The dev and preview servers serve a site under the base path of `site.baseUrl`, as the host
 * does: real files, real HTTP requests.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createDevServer, type DevServer } from '../../src/core/dev.js';
import { createPreviewServer, type PreviewServer } from '../../src/core/preview.js';
import type { Logger } from '../../src/types/index.js';

/**
 * Sends a GET request without following redirects.
 */
function get(
  port: number,
  path: string,
): Promise<{ status: number; location: string | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    request({ host: 'localhost', port, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, location: res.headers.location, body }),
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

/** Server tests that expect the same answers from dev and preview */
function describeBaseBehavior(
  name: string,
  port: number,
  baseUrl: string,
  start: () => Promise<{ url: string; stop: () => Promise<void> }>,
  setup: (projectDir: string) => Promise<void>,
  liveReload = false,
): void {
  describe(name, () => {
    let projectDir: string;
    let originalCwd: string;
    let server: { url: string; stop: () => Promise<void> };

    beforeAll(async () => {
      originalCwd = process.cwd();
      projectDir = await mkdtemp(join(tmpdir(), 'stati-base-path-server-'));
      await writeFile(
        join(projectDir, 'stati.config.js'),
        `export default { site: { title: 'Site', baseUrl: ${JSON.stringify(baseUrl)} } };`,
      );
      await setup(projectDir);
      process.chdir(projectDir);
      server = await start();
    });

    afterAll(async () => {
      await server.stop();
      process.chdir(originalCwd);
      await rm(projectDir, { recursive: true, force: true });
    });

    it('reports a URL that includes the base path', () => {
      expect(server.url).toBe(`http://localhost:${port}/sub/`);
    });

    it('serves pages, files and the 404 page under the base path', async () => {
      expect(await get(port, '/sub/')).toMatchObject({
        status: 200,
        body: expect.stringContaining('<a href="/sub/about">About</a>'),
      });
      expect(await get(port, '/sub/about')).toMatchObject({
        status: 200,
        body: expect.stringContaining('About page'),
      });
      expect(await get(port, '/sub/about/')).toMatchObject({ status: 200 });
      expect(await get(port, '/sub/data.json?v=1')).toMatchObject({
        status: 200,
        body: '{"ok":true}',
      });
      expect(await get(port, '/sub/missing')).toMatchObject({ status: 404 });
    });

    it('redirects the root and the bare base path to the base path, keeping the query', async () => {
      expect(await get(port, '/')).toMatchObject({ status: 302, location: '/sub/' });
      expect(await get(port, '/?utm=1')).toMatchObject({ status: 302, location: '/sub/?utm=1' });
      expect(await get(port, '/sub')).toMatchObject({ status: 302, location: '/sub/' });
    });

    it('does not serve URLs outside the base path', async () => {
      for (const path of ['/about', '/data.json', '/subway/', '/other/sub/']) {
        expect(await get(port, path)).toMatchObject({
          status: 404,
          body: '404 - Not found. This site is served under /sub/',
        });
      }
    });

    it.runIf(liveReload)(
      'keeps the live reload socket at /__ws, outside the base path',
      async () => {
        const socket = new globalThis.WebSocket(`ws://localhost:${port}/__ws`);
        await new Promise<void>((resolve, reject) => {
          socket.addEventListener('open', () => resolve());
          socket.addEventListener('error', () => reject(new Error('The socket did not open')));
        });
        socket.close();
        expect((await get(port, '/sub/')).body).toContain(`ws://localhost:${port}/__ws`);
      },
    );

    it('does not serve files outside the output directory', async () => {
      expect(await get(port, '/sub/../secret.txt')).toMatchObject({ status: 403 });
      expect(await get(port, '/sub/%2e%2e/secret.txt')).toMatchObject({ status: 403 });
    });
  });
}

const PAGE = (body: string) => `<html><head><title>x</title></head><body>${body}</body></html>`;

describeBaseBehavior(
  'preview server with a base path',
  4141,
  'https://example.com/sub',
  async () => {
    const server: PreviewServer = await createPreviewServer({ port: 4141, logger });
    await server.start();
    return server;
  },
  async (projectDir) => {
    const dist = join(projectDir, 'dist');
    await mkdir(join(dist, 'about'), { recursive: true });
    await writeFile(join(dist, 'index.html'), PAGE('<a href="/sub/about">About</a>'));
    await writeFile(join(dist, 'about', 'index.html'), PAGE('About page'));
    await writeFile(join(dist, 'data.json'), '{"ok":true}');
    await writeFile(join(projectDir, 'secret.txt'), 'secret');
  },
);

describeBaseBehavior(
  'dev server with a base path',
  3196,
  'https://example.com/sub',
  async () => {
    const server: DevServer = await createDevServer({ port: 3196, logger });
    await server.start();
    return server;
  },
  async (projectDir) => {
    await mkdir(join(projectDir, 'site'), { recursive: true });
    await mkdir(join(projectDir, 'public'), { recursive: true });
    await writeFile(
      join(projectDir, 'site', 'layout.eta'),
      '<!DOCTYPE html><html><head><title>x</title></head><body><a href="<%= stati.url(\'/about\') %>">About</a><%~ stati.content %></body></html>',
    );
    await writeFile(join(projectDir, 'site', 'index.md'), '---\ntitle: Home\n---\nHome');
    await writeFile(join(projectDir, 'site', 'about.md'), '---\ntitle: About\n---\nAbout page');
    await writeFile(join(projectDir, 'public', 'data.json'), '{"ok":true}');
    await writeFile(join(projectDir, 'secret.txt'), 'secret');
  },
  true,
);

describe('dev and preview servers without a base path', () => {
  let projectDir: string;
  let originalCwd: string;
  let dev: DevServer;
  let preview: PreviewServer;

  beforeAll(async () => {
    originalCwd = process.cwd();
    projectDir = await mkdtemp(join(tmpdir(), 'stati-no-base-path-server-'));
    await mkdir(join(projectDir, 'site'), { recursive: true });
    await mkdir(join(projectDir, 'dist'), { recursive: true });
    await writeFile(
      join(projectDir, 'stati.config.js'),
      `export default { site: { title: 'Site', baseUrl: 'https://example.com/' } };`,
    );
    await writeFile(join(projectDir, 'site', 'layout.eta'), PAGE('<%~ stati.content %>'));
    await writeFile(join(projectDir, 'site', 'index.md'), '---\ntitle: Home\n---\nHome');
    await writeFile(join(projectDir, 'dist', 'about.html'), PAGE('About page'));
    process.chdir(projectDir);
    dev = await createDevServer({ port: 3197, logger });
    await dev.start();
    preview = await createPreviewServer({ port: 4142, logger });
    await preview.start();
  });

  afterAll(async () => {
    await dev.stop();
    await preview.stop();
    process.chdir(originalCwd);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('keep the plain address and serve the site at the root', async () => {
    expect(dev.url).toBe('http://localhost:3197');
    expect(preview.url).toBe('http://localhost:4142');
    expect(await get(3197, '/')).toMatchObject({
      status: 200,
      body: expect.stringContaining('Home'),
    });
    expect(await get(4142, '/about')).toMatchObject({
      status: 200,
      body: expect.stringContaining('About page'),
    });
  });
});
