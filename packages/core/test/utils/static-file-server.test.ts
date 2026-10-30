/**
 * The file serving the dev and preview servers share, against real files.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ServerResponse } from 'node:http';
import open from 'open';
import { createStaticFileServer, openInBrowser } from '../../src/core/utils/server.utils.js';
import type { Logger } from '../../src/types/index.js';

// Reads pass through, so a test can make one fail
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});

vi.mock('open', () => ({ default: vi.fn() }));

function createLogger(): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };
}

function createResponse() {
  const res = { writeHead: vi.fn(), end: vi.fn() };
  return { res, response: res as unknown as ServerResponse };
}

const PAGE = '<html><body><h1>Home</h1></body></html>';
const addMarker = (html: string) => html.replace('</body>', '<p>added</p></body>');

describe('createStaticFileServer', () => {
  let projectDir: string;
  let outDir: string;
  let siteWith404: string;

  beforeAll(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'stati-static-file-server-'));
    outDir = join(projectDir, 'dist');
    siteWith404 = join(projectDir, 'with-404');
    await mkdir(join(outDir, 'about'), { recursive: true });
    await mkdir(join(outDir, 'empty'), { recursive: true });
    await mkdir(siteWith404, { recursive: true });
    await writeFile(join(outDir, 'index.html'), PAGE);
    await writeFile(join(outDir, 'about', 'index.html'), '<html><body>About</body></html>');
    await writeFile(join(outDir, 'data.json'), '{"ok":true}');
    await writeFile(join(projectDir, 'secret.txt'), 'secret');
    await writeFile(join(siteWith404, '404.html'), '<html><body>Gone</body></html>');
  });

  afterAll(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('serves a file as it is, with its content type', async () => {
    const { serve } = createStaticFileServer({ outDir, logger: createLogger() });

    const response = await serve('/data.json');

    expect(response).toMatchObject({ mimeType: 'application/json', statusCode: 200 });
    expect(String(response.content)).toBe('{"ok":true}');
  });

  it('serves the page of a pretty URL', async () => {
    const { serve } = createStaticFileServer({ outDir, logger: createLogger() });

    const response = await serve('/about');

    expect(response).toMatchObject({ mimeType: 'text/html', statusCode: 200 });
    expect(String(response.content)).toContain('About');
  });

  it('forbids paths outside the output directory', async () => {
    const { serve } = createStaticFileServer({ outDir, logger: createLogger() });

    expect(await serve('/../secret.txt')).toEqual({
      content: '403 - Forbidden',
      mimeType: 'text/plain',
      statusCode: 403,
    });
  });

  it('answers a missing file or folder with a plain 404 when the site has no 404 page', async () => {
    const { serve } = createStaticFileServer({ outDir, logger: createLogger() });

    expect(await serve('/missing.png')).toEqual({
      content: '404 - File not found',
      mimeType: 'text/plain',
      statusCode: 404,
    });
    expect(await serve('/empty/')).toEqual({
      content: '404 - Directory listing not available',
      mimeType: 'text/plain',
      statusCode: 404,
    });
  });

  it('serves the site 404 page as built, with a 404 status', async () => {
    const { serve } = createStaticFileServer({ outDir: siteWith404, logger: createLogger() });

    const response = await serve('/missing');

    expect(response).toMatchObject({ mimeType: 'text/html', statusCode: 404 });
    expect(String(response.content)).toBe('<html><body>Gone</body></html>');
  });

  it('rewrites the pages it serves, the 404 page included, and no other file', async () => {
    const transformHtml = vi.fn(addMarker);
    const pages = createStaticFileServer({ outDir, logger: createLogger(), transformHtml });
    const withNotFound = createStaticFileServer({
      outDir: siteWith404,
      logger: createLogger(),
      transformHtml,
    });

    expect((await pages.serve('/')).content).toBe(
      '<html><body><h1>Home</h1><p>added</p></body></html>',
    );
    expect((await withNotFound.serve('/missing')).content).toBe(
      '<html><body>Gone<p>added</p></body></html>',
    );
    expect(String((await pages.serve('/data.json')).content)).toBe('{"ok":true}');
    expect(transformHtml).toHaveBeenCalledTimes(2);
  });

  it('lets interceptHtml answer page requests, and serves the file when it returns null', async () => {
    const overlay = { content: 'Build failed', mimeType: 'text/html', statusCode: 500 };
    let intercept = true;
    const interceptHtml = vi.fn(async () => (intercept ? overlay : null));
    const { serve } = createStaticFileServer({ outDir, logger: createLogger(), interceptHtml });

    expect(await serve('/')).toBe(overlay);
    expect(await serve('/about.html')).toBe(overlay);
    // Files pages load are served as they are
    expect((await serve('/data.json')).statusCode).toBe(200);
    expect(interceptHtml.mock.calls).toEqual([['/'], ['/about.html']]);

    intercept = false;
    expect(String((await serve('/')).content)).toBe(PAGE);
  });

  it('answers a file it cannot read with a 500', async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error('EBUSY: resource busy or locked'));
    const { serve } = createStaticFileServer({ outDir, logger: createLogger() });

    expect(await serve('/data.json')).toEqual({
      content: '500 - Error reading file',
      mimeType: 'text/plain',
      statusCode: 500,
    });
  });

  it('responds with the content, never letting the browser cache it', async () => {
    const { respond } = createStaticFileServer({ outDir, logger: createLogger() });
    const { res, response } = createResponse();

    await respond(response, '/data.json');

    expect(res.writeHead).toHaveBeenCalledExactlyOnceWith(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    expect(String(res.end.mock.calls[0]?.[0])).toBe('{"ok":true}');
  });

  it.each([
    ['an Error', new Error('overlay failed')],
    ['something else', 'overlay failed'],
  ])('responds with a 500 and logs it when serving throws %s', async (_kind, thrown) => {
    const logger = createLogger();
    const { respond } = createStaticFileServer({
      outDir,
      logger,
      interceptHtml: () => Promise.reject(thrown),
    });
    const { res, response } = createResponse();

    await respond(response, '/');

    expect(logger.error).toHaveBeenCalledExactlyOnceWith('Server error: overlay failed');
    expect(res.writeHead).toHaveBeenCalledExactlyOnceWith(500, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledExactlyOnceWith('500 - Internal Server Error');
  });
});

describe('openInBrowser', () => {
  it('opens the URL', async () => {
    const logger = createLogger();

    await openInBrowser('http://localhost:3000', logger);

    expect(open).toHaveBeenCalledExactlyOnceWith('http://localhost:3000');
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('says so, without failing, when the browser cannot be opened', async () => {
    vi.mocked(open).mockRejectedValueOnce(new Error('spawn xdg-open ENOENT'));
    const logger = createLogger();

    await openInBrowser('http://localhost:3000', logger);

    expect(logger.info).toHaveBeenCalledExactlyOnceWith('Could not open browser automatically');
  });
});
