import { describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';
import { resolveImageSource } from '../../src/images/resolve.js';
import { renderImg, renderResponsiveImage } from '../../src/images/markup.js';
import type { VariantPlan } from '../../src/images/plan.js';

const root = resolve('/project');
const context = {
  pageSourcePath: join(root, 'site', 'blog', 'post.md'),
  srcDir: join(root, 'site'),
  staticDir: join(root, 'public'),
};

describe('resolveImageSource', () => {
  it('resolves root-relative paths from the static directory', () => {
    expect(resolveImageSource('/images/hero.jpg', context)).toEqual({
      kind: 'static',
      src: '/images/hero.jpg',
      filePath: join(root, 'public', 'images', 'hero.jpg'),
    });
  });

  it('resolves relative paths next to the page', () => {
    expect(resolveImageSource('./hero.png', context)).toMatchObject({
      kind: 'colocated',
      filePath: join(root, 'site', 'blog', 'hero.png'),
    });
    expect(resolveImageSource('../shared/a.webp', context)).toMatchObject({
      kind: 'colocated',
      filePath: join(root, 'site', 'shared', 'a.webp'),
    });
  });

  it('decodes URL escapes and ignores queries and fragments', () => {
    expect(resolveImageSource('/images/my%20photo.jpg?v=2#x', context)).toMatchObject({
      kind: 'static',
      src: '/images/my%20photo.jpg?v=2#x',
      filePath: join(root, 'public', 'images', 'my photo.jpg'),
    });
  });

  it.each([
    'https://cdn.example.com/a.jpg',
    '//cdn.example.com/a.jpg',
    'data:image/png;base64,AAAA',
    '/images/logo.svg',
    '/files/report.pdf',
    '/images/%E0%A4%A.png',
    '',
  ])('leaves %j as authored', (src) => {
    expect(resolveImageSource(src, context)).toMatchObject({ kind: 'skip' });
  });

  it('strips the ?raw opt-out', () => {
    expect(resolveImageSource('/images/hero.jpg?raw', context)).toEqual({
      kind: 'skip',
      src: '/images/hero.jpg',
    });
  });

  it('does not resolve outside the site', () => {
    expect(resolveImageSource('../../../etc/a.png', context)).toMatchObject({ kind: 'skip' });
    expect(resolveImageSource('/../secret.png', context)).toMatchObject({ kind: 'skip' });
  });
});

describe('renderImg', () => {
  it('adds dimensions and lazy loading, escaping every attribute', () => {
    expect(
      renderImg('/a.jpg?x=1&y=2', {
        alt: 'A "quoted" <alt>',
        title: 'T',
        attributes: [
          ['class', 'wide'],
          ['loading', 'eager'],
        ],
        width: 800,
        height: 600,
      }),
    ).toBe(
      '<img src="/a.jpg?x=1&amp;y=2" alt="A &quot;quoted&quot; &lt;alt&gt;" title="T" class="wide" width="800" height="600" loading="lazy" decoding="async">',
    );
  });

  it('loads eagerly with high priority when asked', () => {
    expect(renderImg('/a.jpg', { alt: '', eager: true })).toBe(
      '<img src="/a.jpg" alt="" loading="eager" fetchpriority="high" decoding="async">',
    );
  });
});

describe('renderResponsiveImage', () => {
  const plan: VariantPlan = {
    key: 'variants:k',
    outputs: [],
    sources: [{ type: 'image/avif', srcset: '/_img/a-1-480.avif 480w' }],
    fallback: { src: '/_img/a-1-480.jpg', srcset: '/_img/a-1-480.jpg 480w' },
  };

  it('wraps the fallback in a picture with one source per format', () => {
    expect(renderResponsiveImage(plan, { alt: 'A', width: 480, height: 270 }, '100vw')).toBe(
      '<picture><source type="image/avif" srcset="/_img/a-1-480.avif 480w" sizes="100vw">' +
        '<img src="/_img/a-1-480.jpg" srcset="/_img/a-1-480.jpg 480w" sizes="100vw" alt="A" width="480" height="270" loading="lazy" decoding="async"></picture>',
    );
  });

  it('renders a plain img with srcset when there are no modern formats', () => {
    expect(renderResponsiveImage({ ...plan, sources: [] }, { alt: 'A' }, '50vw')).toBe(
      '<img src="/_img/a-1-480.jpg" srcset="/_img/a-1-480.jpg 480w" sizes="50vw" alt="A" loading="lazy" decoding="async">',
    );
  });
});
