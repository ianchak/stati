import { describe, expect, it } from 'vitest';
import {
  addBasePath,
  getBasePath,
  stripBasePath,
  withBasePath,
} from '../../src/core/utils/base-path.utils.js';
import { resolveBasePathRequest } from '../../src/core/utils/server.utils.js';
import { autoInjectBundles } from '../../src/core/utils/typescript.utils.js';

describe('getBasePath', () => {
  it.each([
    ['https://example.com', ''],
    ['https://example.com/', ''],
    ['http://localhost:3000', ''],
    ['https://example.com/docs', '/docs'],
    ['https://example.com/docs/', '/docs'],
    ['https://stati.build/demos/blog/', '/demos/blog'],
    ['https://example.com//docs//blog//', '/docs/blog'],
    ['https://example.com/a/./b/../c', '/a/c'],
    ['https://example.com/docs?x=1#top', '/docs'],
    ['https://example.com/my docs', '/my%20docs'],
    ['https://user.github.io/repo', '/repo'],
  ])('reads the path of %s as "%s"', (baseUrl, expected) => {
    expect(getBasePath(baseUrl)).toBe(expected);
  });

  it.each([undefined, '', 'example.com/docs', '/docs', 'not a url', 'ftp://example.com/docs'])(
    'gives no base path for %s',
    (baseUrl) => {
      expect(getBasePath(baseUrl)).toBe('');
    },
  );
});

describe('addBasePath', () => {
  it('puts the base path in front of any path from the site root', () => {
    expect(addBasePath('/posts/hello', '/docs')).toBe('/docs/posts/hello');
    expect(addBasePath('/', '/docs')).toBe('/docs/');
    // Whatever the path starts with: the caller knows it is a site path
    expect(addBasePath('/docs/posts', '/docs')).toBe('/docs/docs/posts');
  });

  it.each(['https://x.test/a', 'mailto:a@b.test', '//cdn.test/a', '#top', '?page=2', 'a/b', ''])(
    'leaves "%s" alone',
    (value) => {
      expect(addBasePath(value, '/docs')).toBe(value);
    },
  );

  it('changes nothing without a base path', () => {
    expect(addBasePath('/posts/hello', '')).toBe('/posts/hello');
  });
});

describe('withBasePath', () => {
  it('adds the base path to a site path', () => {
    expect(withBasePath('/posts/hello', '/docs')).toBe('/docs/posts/hello');
    expect(withBasePath('/', '/docs')).toBe('/docs/');
    expect(withBasePath('/posts?page=2#top', '/docs')).toBe('/docs/posts?page=2#top');
  });

  it('is idempotent', () => {
    for (const path of ['/posts/hello', '/', '/posts?x=1', '/docs-guide']) {
      const once = withBasePath(path, '/docs');
      expect(withBasePath(once, '/docs')).toBe(once);
    }
  });

  it.each([
    ['/docs', '/docs'],
    ['/docs/', '/docs/'],
    ['/docs/posts', '/docs/posts'],
    ['/docs?x=1', '/docs?x=1'],
    ['/docs#top', '/docs#top'],
  ])('leaves %s, which starts with the base path', (path, expected) => {
    expect(withBasePath(path, '/docs')).toBe(expected);
  });

  it('does not take a path that only begins like the base path for one inside it', () => {
    expect(withBasePath('/docs-guide', '/docs')).toBe('/docs/docs-guide');
    expect(withBasePath('/documents', '/docs')).toBe('/docs/documents');
  });

  it.each([
    'https://example.com/a',
    'http://example.com/a',
    'mailto:a@b.test',
    'tel:+1',
    'data:text/plain,x',
    '//cdn.example.com/a.js',
    '#top',
    '?page=2',
    'relative/path',
    './relative',
    '../up',
    '',
  ])('leaves "%s" alone', (value) => {
    expect(withBasePath(value, '/docs')).toBe(value);
  });

  it('returns every value as it is without a base path', () => {
    for (const value of ['/posts', '/', '#top', 'https://example.com', '']) {
      expect(withBasePath(value, '')).toBe(value);
    }
  });
});

describe('stripBasePath', () => {
  it('gives the path from the site root', () => {
    expect(stripBasePath('/docs/posts/hello', '/docs')).toBe('/posts/hello');
    expect(stripBasePath('/docs/', '/docs')).toBe('/');
    expect(stripBasePath('/docs', '/docs')).toBe('/');
  });

  it('gives undefined for a path outside the base path', () => {
    expect(stripBasePath('/posts', '/docs')).toBeUndefined();
    expect(stripBasePath('/docs-guide', '/docs')).toBeUndefined();
    expect(stripBasePath('/', '/docs')).toBeUndefined();
  });

  it('returns the path as it is without a base path', () => {
    expect(stripBasePath('/posts', '')).toBe('/posts');
  });
});

describe('resolveBasePathRequest', () => {
  it('serves the request as it is without a base path', () => {
    expect(resolveBasePathRequest('/about?x=1', '/about', '')).toEqual({
      kind: 'serve',
      path: '/about',
    });
  });

  it('serves a request inside the base path from the site root', () => {
    expect(resolveBasePathRequest('/docs/about', '/docs/about', '/docs')).toEqual({
      kind: 'serve',
      path: '/about',
    });
    expect(resolveBasePathRequest('/docs/', '/docs/', '/docs')).toEqual({
      kind: 'serve',
      path: '/',
    });
    expect(resolveBasePathRequest('/docs/a/b.css?v=1', '/docs/a/b.css', '/docs')).toEqual({
      kind: 'serve',
      path: '/a/b.css',
    });
  });

  it('redirects the root and the bare base path to the base path, keeping the query', () => {
    expect(resolveBasePathRequest('/', '/', '/docs')).toEqual({
      kind: 'redirect',
      location: '/docs/',
    });
    expect(resolveBasePathRequest('/?a=1&b=2', '/', '/docs')).toEqual({
      kind: 'redirect',
      location: '/docs/?a=1&b=2',
    });
    expect(resolveBasePathRequest('/docs?a=1#x', '/docs', '/docs')).toEqual({
      kind: 'redirect',
      location: '/docs/?a=1',
    });
    expect(resolveBasePathRequest(undefined, '/', '/docs')).toEqual({
      kind: 'redirect',
      location: '/docs/',
    });
  });

  it('treats everything else as outside the site', () => {
    expect(resolveBasePathRequest('/about', '/about', '/docs')).toEqual({ kind: 'outside' });
    expect(resolveBasePathRequest('/docs-guide/', '/docs-guide/', '/docs')).toEqual({
      kind: 'outside',
    });
  });

  it('matches an escaped base path against the decoded request path', () => {
    expect(resolveBasePathRequest('/my%20docs/a', '/my docs/a', '/my%20docs')).toEqual({
      kind: 'serve',
      path: '/a',
    });
    expect(resolveBasePathRequest('/', '/', '/my%20docs')).toEqual({
      kind: 'redirect',
      location: '/my%20docs/',
    });
  });

  it('uses a base path that is not valid percent-encoding as it is', () => {
    expect(resolveBasePathRequest('/100%/a', '/100%/a', '/100%')).toEqual({
      kind: 'serve',
      path: '/a',
    });
  });
});

describe('autoInjectBundles with a base path', () => {
  const html = '<html><body>Content</body></html>';

  it('puts the base path in front of every script URL', () => {
    const result = autoInjectBundles(html, ['/_assets/core.js', '/_assets/docs.js'], '/docs');

    expect(result).toContain('<script type="module" src="/docs/_assets/core.js"></script>');
    expect(result).toContain('<script type="module" src="/docs/_assets/docs.js"></script>');
  });

  it('does not add a script the template already has with the base path', () => {
    const page =
      '<html><body><script type="module" src="/docs/_assets/core.js"></script></body></html>';

    expect(autoInjectBundles(page, ['/_assets/core.js'], '/docs')).toBe(page);
  });

  it('adds a script whose URL lacks the base path, which does not load there', () => {
    const page = '<html><body><script type="module" src="/_assets/core.js"></script></body></html>';

    expect(autoInjectBundles(page, ['/_assets/core.js'], '/docs')).toContain(
      '<script type="module" src="/docs/_assets/core.js"></script>',
    );
  });

  it('keeps the URLs without a base path', () => {
    expect(autoInjectBundles(html, ['/_assets/core.js'])).toContain(
      '<script type="module" src="/_assets/core.js"></script>',
    );
  });
});
