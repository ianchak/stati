import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { loadConfig } from '../../src/config/loader.js';
import { invalidate } from '../../src/core/invalidate.js';
import { setEnv } from '../../src/env.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const LAYOUT =
  '<html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>';
const BLOG_INDEX_LAYOUT =
  '<html><body><%= stati.collection.pages.map((p) => p.url).join(",") %></body></html>';
/** Lists the pages of a generated page */
const TAG_LAYOUT = `<html><head><title><%= stati.page.title %></title></head><body>
<h1><%= stati.page.heading %></h1><p>key=<%= stati.generated.key %> label=<%= stati.generated.label %></p>
<ul><% for (const post of (stati.pagination ?? stati.generated).items) { %><li><%= post.frontMatter.title %></li><% } %></ul>
</body></html>`;

const TAG_TEMPLATE = page(
  {
    title: 'Posts tagged {tag}',
    heading: 'Use {{tag}} for {tag}, not {author}',
    seo: { description: 'Every post about {tag}' },
    generate: { from: 'tags' },
  },
  'Posts about one tag.',
);

const sorted = (urls: string[]) => [...urls].sort();

const baseConfig = (extra: Partial<StatiConfig> = {}): StatiConfig => ({
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: { title: 'Fixture', baseUrl: 'https://example.com' },
  ...extra,
});

describe('generated pages', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write('site/blog/index.eta', BLOG_INDEX_LAYOUT);
    await site.write('site/blog/tags/layout.eta', TAG_LAYOUT);
    await site.write('site/index.md', page({ title: 'Home' }));
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    await site.write(
      'site/blog/first.md',
      page({ title: 'First', publishedAt: '2026-01-01', tags: ['CSS', 'JavaScript'] }),
    );
    await site.write(
      'site/blog/second.md',
      page({ title: 'Second', publishedAt: '2026-02-01', tags: ['CSS'] }),
    );
    await site.write('site/blog/tags/[tag].md', TAG_TEMPLATE);
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  it('creates one page per tag of the collection and none for the template', async () => {
    const { rendered } = await site.build();

    expect(sorted(rendered)).toEqual([
      '/',
      '/blog',
      '/blog/first',
      '/blog/second',
      '/blog/tags/css',
      '/blog/tags/javascript',
    ]);
    expect(await site.exists('dist/blog/tags/[tag].html')).toBe(false);

    const css = await site.read('dist/blog/tags/css.html');
    expect(css).toContain('key=css label=CSS');
    expect(css).toContain('<li>Second</li><li>First</li>');
    expect(await site.read('dist/blog/tags/javascript.html')).toContain('<li>First</li></ul>');
  });

  it('fills in {param} placeholders in front matter with the label', async () => {
    await site.build();
    const css = await site.read('dist/blog/tags/css.html');

    expect(css).toContain('<title>Posts tagged CSS</title>');
    expect(css).toContain('<h1>Use {tag} for CSS, not {author}</h1>');
    // Nested values are filled in too, before SEO reads them
    expect(css).toContain('content="Every post about CSS"');
  });

  it('keeps generated pages out of the collection', async () => {
    await site.build();

    expect(await site.read('dist/blog.html')).toContain('/blog/first,/blog/second</body>');
  });

  it('merges values that slugify to the same key and warns', async () => {
    await site.write(
      'site/blog/third.md',
      page({ title: 'Third', publishedAt: '2026-03-01', tags: ['css'] }),
    );
    const { warnings } = await site.build();

    expect(warnings).toContainEqual(
      expect.stringContaining('"CSS" and "css" both become the key "css"'),
    );
    // The newest post's spelling wins
    const css = await site.read('dist/blog/tags/css.html');
    expect(css).toContain('label=css');
    expect(css).toContain('<li>Third</li><li>Second</li><li>First</li>');
  });

  it('skips values without letters or digits', async () => {
    await site.write(
      'site/blog/third.md',
      page({ title: 'Third', publishedAt: '2026-03-01', tags: ['!!!', ' '] }),
    );
    const { warnings, rendered } = await site.build();

    expect(warnings).toContainEqual(
      expect.stringContaining('"!!!" has no Latin letters or digits to use in a URL'),
    );
    expect(rendered.filter((url) => url.startsWith('/blog/tags/'))).toHaveLength(2);
  });

  it('leaves out tags only drafts use, unless drafts are included', async () => {
    await site.write(
      'site/blog/draft.md',
      page({ title: 'Draft', publishedAt: '2026-03-01', tags: ['Secret'], draft: true }),
    );

    await site.build();
    expect(await site.exists('dist/blog/tags/secret.html')).toBe(false);

    await site.build({ includeDrafts: true });
    expect(await site.read('dist/blog/tags/secret.html')).toContain('<li>Draft</li>');
  });

  it('rebuilds only the generated pages whose items changed', async () => {
    await site.build();

    await site.write(
      'site/blog/third.md',
      page({ title: 'Third', publishedAt: '2026-03-01', tags: ['CSS'] }),
    );
    const { rendered } = await site.build();

    expect(sorted(rendered)).toEqual(['/blog', '/blog/tags/css', '/blog/third']);
  });

  it('removes the page of a tag that is no longer used', async () => {
    await site.build();

    await site.write(
      'site/blog/first.md',
      page({ title: 'First', publishedAt: '2026-01-01', tags: ['CSS'] }),
    );
    await site.build();

    expect(await site.exists('dist/blog/tags/javascript.html')).toBe(false);
    expect(await site.exists('dist/blog/tags/css.html')).toBe(true);
  });

  it('rebuilds every generated page that reads the whole collection', async () => {
    await site.write(
      'site/blog/tags/layout.eta',
      '<html><body><%= Object.keys(stati.collection.pagesByTag).join(",") %></body></html>',
    );
    await site.build();

    await site.write(
      'site/blog/second.md',
      page({ title: 'Second', publishedAt: '2026-02-01', tags: ['CSS', 'HTML'] }),
    );
    const { rendered } = await site.build();

    expect(sorted(rendered)).toEqual([
      '/blog',
      '/blog/second',
      '/blog/tags/css',
      '/blog/tags/html',
      '/blog/tags/javascript',
    ]);
    expect(await site.read('dist/blog/tags/javascript.html')).toContain('CSS,JavaScript,HTML');
  });

  it('tags the cache entry with the key and label, so invalidate refreshes the page', async () => {
    await site.build();
    expect((await site.manifest()).entries['/blog/tags/css.html']!.tags).toEqual(['css', 'CSS']);

    const result = await invalidate('tag:css');
    expect(result.invalidatedPaths).toContain('/blog/tags/css.html');
    expect(sorted((await site.build()).rendered)).toEqual(['/blog/tags/css']);
  });

  it('splits generated pages with generate.paginate', async () => {
    await site.write(
      'site/blog/tags/[tag].md',
      page({ title: 'Posts tagged {tag}', generate: { from: 'tags', paginate: { size: 1 } } }),
    );
    await site.build();

    expect(await site.read('dist/blog/tags/css.html')).toContain('<li>Second</li></ul>');
    expect(await site.read('dist/blog/tags/css/page/2.html')).toContain('<li>First</li></ul>');
    expect(await site.read('dist/blog/tags/css/page/2.html')).toContain('label=CSS');
    expect(await site.exists('dist/blog/tags/javascript/page/2.html')).toBe(false);
  });

  it('uses [param] in a permalink for the key', async () => {
    await site.write(
      'site/blog/tags/[tag].md',
      page({
        title: 'Posts tagged {tag}',
        permalink: '/topics/[tag]/',
        generate: { from: 'tags' },
      }),
    );
    await site.build();

    expect(await site.read('dist/topics/css/index.html')).toContain('key=css');
  });

  it('reads the collection of the nearest folder with pages when its own folder has an index page', async () => {
    await site.write('site/blog/tags/index.md', page({ title: 'All tags', layout: '/layout' }));
    await site.build();

    // /blog/tags has an index page but no pages of its own, so keys come from /blog
    expect(await site.exists('dist/blog/tags/css.html')).toBe(true);
    expect(await site.read('dist/blog.html')).toContain('/blog/first,/blog/second,/blog/tags');
  });

  it('reads the collection named in the template front matter', async () => {
    await site.remove('site/blog/tags/[tag].md');
    await site.write(
      'site/tags/[tag].md',
      page({ title: 'Posts tagged {tag}', collection: '/blog', generate: { from: 'tags' } }),
    );
    await site.write('site/tags/layout.eta', TAG_LAYOUT);
    await site.build();

    expect(await site.read('dist/tags/css.html')).toContain('<li>Second</li><li>First</li>');
  });

  it('warns about a template without a collection or keys', async () => {
    await site.write('site/notes/[note].md', page({ title: '{note}', generate: { from: 'tags' } }));
    await site.write('site/misc/[thing].md', page({ title: '{thing}' }));
    const { warnings } = await site.build();

    expect(warnings).toContainEqual(
      expect.stringContaining('notes/[note].md: generate.from needs a collection'),
    );
    expect(warnings).toContainEqual(expect.stringContaining('misc/[thing].md: set generate.from'));
  });

  it('skips a generated page whose URL a real page has', async () => {
    await site.write(
      'site/blog/tags/css.md',
      page({ title: 'Hand-written CSS page', layout: '/layout' }),
    );
    const { warnings } = await site.build();

    expect(warnings).toContainEqual(expect.stringContaining('would use the URL /blog/tags/css'));
    expect(await site.read('dist/blog/tags/css.html')).toContain('Hand-written CSS page');
  });

  it('skips a generated page that would write the file of a real page', async () => {
    // /blog/tags/ and /blog/tags/index both write blog/tags/index.html
    await site.write(
      'site/blog/tags/index.md',
      page({ title: 'All tags', layout: '/layout', permalink: '/blog/tags/' }),
    );
    await site.write(
      'site/blog/third.md',
      page({ title: 'Third', publishedAt: '2026-03-01', tags: ['Index'] }),
    );
    const { warnings } = await site.build();

    expect(warnings).toContainEqual(
      expect.stringContaining(
        'would use the URL /blog/tags/index, which writes the same file as /blog/tags/',
      ),
    );
    expect(await site.read('dist/blog/tags/index.html')).toContain('<title>All tags</title>');
  });

  it('builds tags named like object properties', async () => {
    await site.write(
      'site/blog/third.md',
      page({ title: 'Third', publishedAt: '2026-03-01', tags: ['constructor', 'toString'] }),
    );
    await site.write(
      'site/blog/index.eta',
      `<html><body><% const byTag = stati.collection.pagesByTag; %><%=
Object.keys(byTag).sort().map((tag) => tag + '=' + byTag[tag].length).join(',') %></body></html>`,
    );
    await site.build();

    expect(await site.read('dist/blog.html')).toContain(
      'CSS=2,JavaScript=1,constructor=1,toString=1',
    );
    expect(await site.exists('dist/blog/tags/constructor.html')).toBe(true);
    expect(await site.exists('dist/blog/tags/tostring.html')).toBe(true);
  });

  it('leaves generated pages out of navigation unless the template opts in', async () => {
    await site.write(
      'site/layout.eta',
      '<html><body><%= JSON.stringify(stati.nav.getTree().map((n) => n.url)) %><%= stati.nav.findNode("/blog/tags/css")?.url ?? "none" %></body></html>',
    );
    await site.build();
    expect(await site.read('dist/index.html')).toContain('none');

    await site.write(
      'site/blog/tags/[tag].md',
      page({ title: 'Posts tagged {tag}', nav: true, generate: { from: 'tags' } }),
    );
    await site.build();
    expect(await site.read('dist/index.html')).toContain('/blog/tags/css');
  });

  it('keeps generated pages out of search and RSS by default and in the sitemap', async () => {
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        search: { enabled: true, hashFilename: false },
        sitemap: { enabled: true },
        rss: {
          enabled: true,
          feeds: [{ filename: 'feed.xml', title: 'Feed', description: 'All', link: '/' }],
        },
      }),
    );
    await site.build();

    expect(await site.read('dist/search-index.json')).not.toContain('/blog/tags/');
    expect(await site.read('dist/feed.xml')).not.toContain('/blog/tags/');
    expect(await site.read('dist/sitemap.xml')).toContain('https://example.com/blog/tags/css');

    await site.write(
      'site/blog/tags/[tag].md',
      page({ title: 'Posts tagged {tag}', search: true, generate: { from: 'tags' } }, 'About it.'),
    );
    await site.build();
    expect(await site.read('dist/search-index.json')).toContain('/blog/tags/css');
  });
});

describe('collections.generate', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig));
    await site.write('site/layout.eta', LAYOUT);
    await site.write(
      'site/authors/layout.eta',
      `<html><head><title><%= stati.page.title %></title></head><body>
<p><%= stati.generated.data.bio %></p>
<ul><% for (const post of stati.generated.items) { %><li><%= post.frontMatter.title %></li><% } %></ul>
</body></html>`,
    );
    await site.write('site/index.md', page({ title: 'Home' }));
    await site.write('site/blog/index.md', page({ title: 'Blog' }));
    await site.write('site/blog/first.md', page({ title: 'First', author: 'ada' }));
    await site.write('site/blog/second.md', page({ title: 'Second', author: 'alan' }));
    await site.write('site/authors/[author].md', page({ title: 'Posts by {author}' }));
  });

  afterEach(async () => {
    setEnv('development');
    await site.cleanup();
  });

  const useGenerate = (bio: string) =>
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        collections: {
          generate: ({ pages }) => [
            {
              url: '/authors/ada',
              template: 'authors/[author].md',
              label: 'Ada Lovelace',
              items: pages.filter((p) => p.frontMatter.author === 'ada'),
              data: { bio },
            },
            { url: '/authors/nobody', template: 'authors/[missing].md' },
          ],
        },
      }),
    );

  it('renders a page per entry with its template, items and data', async () => {
    useGenerate('Wrote the first program.');
    const { rendered, warnings } = await site.build();

    expect(rendered).toContain('/authors/ada');
    const ada = await site.read('dist/authors/ada.html');
    expect(ada).toContain('<title>Posts by Ada Lovelace</title>');
    expect(ada).toContain('<p>Wrote the first program.</p>');
    expect(ada).toContain('<li>First</li></ul>');
    expect(warnings).toContainEqual(
      expect.stringContaining('names the template "authors/[missing].md"'),
    );
  });

  it('rebuilds a page when its data changes', async () => {
    useGenerate('One');
    await site.build();

    useGenerate('Two');
    const { rendered } = await site.build();

    expect(rendered).toEqual(['/authors/ada']);
    expect(await site.read('dist/authors/ada.html')).toContain('<p>Two</p>');
  });

  const useData = (data: Record<string, unknown>) =>
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        collections: {
          generate: () => [{ url: '/authors/ada', template: 'authors/[author].md', data }],
        },
      }),
    );

  it('rebuilds a page when a date in its data changes', async () => {
    useData({ bio: 'Same', joined: new Date('2026-01-01') });
    await site.build();

    useData({ bio: 'Same', joined: new Date('2026-02-01') });
    const { rendered } = await site.build();

    expect(rendered).toEqual(['/authors/ada']);
  });

  it('rebuilds a page whose data cannot be serialized on every build', async () => {
    useData({ bio: 'Same', id: BigInt(1) });
    await site.build();

    expect((await site.build()).rendered).toEqual(['/authors/ada']);
  });

  it('passes the content pages without templates or generated pages', async () => {
    const seen: string[] = [];
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        collections: {
          generate: ({ pages }) => {
            seen.push(...pages.map((p) => p.url));
            return [];
          },
        },
      }),
    );
    await site.build();

    expect(sorted(seen)).toEqual(['/', '/blog', '/blog/first', '/blog/second']);
  });

  it('reports a failing generate function', async () => {
    vi.mocked(loadConfig).mockImplementation(async () =>
      baseConfig({
        collections: {
          generate: () => {
            throw new Error('API down');
          },
        },
      }),
    );

    await expect(site.build()).rejects.toThrow('collections.generate failed: API down');
    expect(join(site.dir, 'dist')).toBeTruthy();
  });
});
