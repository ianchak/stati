import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { basename, join, resolve, sep } from 'node:path';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import {
  getMimeType,
  parseRequestPath,
  resolveNotFoundPage,
  resolveRequestFile,
  resolvePrettyUrl,
  mergeServerOptions,
  assertPortAvailable,
  toPortUnavailableError,
  PortUnavailableError,
} from '../../src/core/utils/server.utils.js';

describe('assertPortAvailable', () => {
  const host = '127.0.0.1';
  let blocker: Server | null = null;

  afterAll(async () => {
    if (blocker) {
      await new Promise<void>((resolve) => blocker!.close(() => resolve()));
    }
  });

  async function occupyRandomPort(): Promise<number> {
    blocker = createServer();
    await new Promise<void>((resolve) => blocker!.listen(0, host, resolve));
    const address = blocker.address();
    if (!address || typeof address === 'string') throw new Error('Unexpected server address');
    return address.port;
  }

  it('should resolve when the port is free and release it afterwards', async () => {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, host, resolve));
    const address = probe.address();
    if (!address || typeof address === 'string') throw new Error('Unexpected server address');
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    await expect(assertPortAvailable(address.port, host)).resolves.toBeUndefined();
    // Port must be released so the real server can bind to it
    await expect(assertPortAvailable(address.port, host)).resolves.toBeUndefined();
  });

  it('should reject with PortUnavailableError when the port is in use', async () => {
    const port = await occupyRandomPort();

    const error = await assertPortAvailable(port, host, 'dev.port').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PortUnavailableError);
    expect(error).toMatchObject({ port, host, code: 'EADDRINUSE' });
    expect((error as Error).message).toBe(
      `Port ${port} is already in use on ${host}. Stop the process using it, or choose another port with --port or \`dev.port\` in your Stati config.`,
    );
  });
});

describe('toPortUnavailableError', () => {
  it('should convert EACCES errors', () => {
    const error = toPortUnavailableError(
      Object.assign(new Error('listen EACCES'), { code: 'EACCES' }),
      80,
      'localhost',
    );

    expect(error).toBeInstanceOf(PortUnavailableError);
    expect((error as Error).message).toBe(
      'Permission denied to use port 80 on localhost. Choose another port.',
    );
  });

  it('should return unrelated errors unchanged', () => {
    const original = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });

    expect(toPortUnavailableError(original, 3000, 'nope.invalid')).toBe(original);
  });
});

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

describe('getMimeType', () => {
  it.each([
    ['/_assets/main-ABC12345.js', 'application/javascript'],
    ['/vendor/lib.mjs', 'application/javascript'],
    ['/_img/photo-480.avif', 'image/avif'],
    ['/sitemap.xml', 'application/xml'],
    ['/rss.xml', 'application/xml'],
    ['/robots.txt', 'text/plain'],
    ['/search-index-a1b2c3d4.json', 'application/json'],
    ['/_assets/main.js.map', 'application/json'],
    ['/site.webmanifest', 'application/manifest+json'],
    ['/fonts/Inter.OTF', 'font/otf'],
    ['/module.wasm', 'application/wasm'],
  ])('should serve %s as %s', (path, type) => {
    expect(getMimeType(path)).toBe(type);
  });

  it('should fall back to application/octet-stream for unknown extensions', () => {
    expect(getMimeType('/archive.xyz')).toBe('application/octet-stream');
    expect(getMimeType('/no-extension')).toBe('application/octet-stream');
  });
});

describe('parseRequestPath', () => {
  it('should drop the query string', () => {
    expect(parseRequestPath('/?utm_source=feed')).toBe('/');
    expect(parseRequestPath('/about?ref=x')).toBe('/about');
    expect(parseRequestPath('/styles.css?v=2')).toBe('/styles.css');
  });

  it('should decode percent-escapes', () => {
    expect(parseRequestPath('/my%20file.pdf')).toBe('/my file.pdf');
    expect(parseRequestPath('/caf%C3%A9')).toBe('/café');
  });

  it('should default a missing URL to the root', () => {
    expect(parseRequestPath(undefined)).toBe('/');
    expect(parseRequestPath('')).toBe('/');
  });

  it('should reject malformed escapes and NUL bytes', () => {
    expect(parseRequestPath('/bad%E0%A4%A')).toBeNull();
    expect(parseRequestPath('/file%00.html')).toBeNull();
  });

  it('should leave traversal segments for the directory check to reject', () => {
    expect(parseRequestPath('/%2e%2e/%2e%2e/etc/passwd')).toBe('/../../etc/passwd');
  });
});

describe('resolveRequestFile', () => {
  const root = resolve(tmpdir(), 'stati-request-file', 'dist');
  const isInsideRoot = (path: string | null) =>
    path === null || path === root || path.startsWith(root + sep);

  it('should resolve request paths inside the served directory', () => {
    expect(resolveRequestFile(root, '/')).toBe(root);
    expect(resolveRequestFile(root, '/about.html')).toBe(join(root, 'about.html'));
    expect(resolveRequestFile(root, '/blog/')).toBe(join(root, 'blog'));
    expect(resolveRequestFile(root, '/a/../b.css')).toBe(join(root, 'b.css'));
    expect(resolveRequestFile(root, '//etc/passwd')).toBe(join(root, 'etc', 'passwd'));
  });

  it('should reject paths that leave the served directory', () => {
    expect(resolveRequestFile(root, '/../secret.txt')).toBeNull();
    expect(resolveRequestFile(root, '/../../../etc/passwd')).toBeNull();
    expect(resolveRequestFile(root, parseRequestPath('/%2e%2e/secret.txt')!)).toBeNull();
    // A sibling directory that shares the name as a prefix is outside too
    expect(resolveRequestFile(root, '/../dist-other/a.html')).toBeNull();
  });

  it('should never return a path outside the directory for separators or drive paths', () => {
    // Backslashes separate on Windows only; elsewhere they are part of a file name
    for (const requestPath of ['/..\\secret.txt', '/C:/Windows/win.ini', '/\\\\server\\share']) {
      expect(isInsideRoot(resolveRequestFile(root, requestPath))).toBe(true);
    }
  });
});

describe('resolvePrettyUrl outside the output directory', () => {
  let parent: string;
  let outDir: string;

  beforeAll(async () => {
    parent = await mkdtemp(join(tmpdir(), 'stati-pretty-url-'));
    outDir = join(parent, 'dist');
    await mkdir(outDir);
    // No index.html, and a file next to the output directory named like its .html sibling
    await writeFile(join(parent, 'dist.html'), 'outside the output directory');
  });

  afterAll(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it('should not serve the .html sibling of the output directory', async () => {
    const requestPath = `/../${basename(outDir)}`;
    const requestFile = resolveRequestFile(outDir, requestPath);
    expect(requestFile).toBe(resolve(outDir));

    const result = await resolvePrettyUrl(outDir, requestPath, requestFile!);
    expect(result).toEqual({ filePath: null, found: false });
  });
});

describe('resolveNotFoundPage', () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'stati-not-found-'));
  });

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it('should return null when the site has no 404 page', async () => {
    expect(await resolveNotFoundPage(outDir)).toBeNull();
  });

  it('should find 404/index.html from a /404/ permalink', async () => {
    await mkdir(join(outDir, '404'));
    await writeFile(join(outDir, '404', 'index.html'), '<h1>Gone</h1>');
    expect(await resolveNotFoundPage(outDir)).toBe(join(outDir, '404', 'index.html'));
  });

  it('should prefer 404.html', async () => {
    await writeFile(join(outDir, '404.html'), '<h1>Not found</h1>');
    expect(await resolveNotFoundPage(outDir)).toBe(join(outDir, '404.html'));
  });
});
