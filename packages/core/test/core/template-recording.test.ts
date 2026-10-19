/**
 * The templates a page records while it renders, and the cache decisions they drive: a page
 * rebuilds when a template it rendered changes or disappears, when a name it looked up would
 * find another file, and never because of a template it did not use.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

const sorted = (values: string[]) => [...values].sort();

/**
 * A shell, a default layout and a blog section with its own layout, and components in a plain
 * partials/ folder.
 */
async function writeSite(site: SiteFixture): Promise<void> {
  await site.write(
    'site/base.eta',
    `<html><head><title><%= stati.page.title %></title></head><body class="<%= stati.props?.section ?? 'page' %>"><%~ stati.include('partials/header') %><%~ stati.body %><%~ stati.include('partials/footer') %></body></html>`,
  );
  await site.write(
    'site/layout.eta',
    `<% stati.layout('base') %><main><%~ stati.content %></main>`,
  );
  await site.write(
    'site/blog/layout.eta',
    `<% stati.layout('base', { section: 'blog' }) %><article><%~ stati.include('partials/callout', { tone: 'info' }, stati.content) %><% if (stati.page.draft) { %><%~ stati.include('partials/draft') %><% } %><% if (stati.include.has('partials/promo')) { %><%~ stati.include('partials/promo') %><% } %></article>`,
  );
  await site.write('site/partials/header.eta', '<header>Site</header>');
  await site.write('site/partials/footer.eta', '<footer>Footer</footer>');
  await site.write(
    'site/partials/callout.eta',
    `<% stati.layout('./frame') %><aside class="<%= stati.props.tone %>"><%~ stati.body %></aside>`,
  );
  await site.write('site/partials/frame.eta', '<div class="frame"><%~ stati.body %></div>');
  await site.write('site/partials/draft.eta', '<p>Draft</p>');
  await site.write('site/partials/unused.eta', 'Never rendered');
  await site.write('site/index.md', page({ title: 'Home' }, 'Home'));
  await site.write('site/about.md', page({ title: 'About' }, 'About'));
  await site.write('site/blog/first.md', page({ title: 'First' }, 'First'));
  await site.write('site/blog/second.md', page({ title: 'Second' }, 'Second'));
}

describe('template recording', () => {
  let site: SiteFixture;
  const posix = (path: string) => path.replace(/\\/g, '/');

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig), { seo: { autoInject: false } });
    await writeSite(site);
  });

  afterEach(async () => {
    setEnv('test');
    await site.cleanup();
  });

  it('renders the shell, sections and components', async () => {
    await site.build();

    expect(await site.read('dist/about.html')).toBe(
      '<html><head><title>About</title></head><body class="page"><header>Site</header><main><p>About</p>\n</main><footer>Footer</footer></body></html>',
    );
    expect(await site.read('dist/blog/first.html')).toBe(
      '<html><head><title>First</title></head><body class="blog"><header>Site</header><article><div class="frame"><aside class="info"><p>First</p>\n</aside></div></article><footer>Footer</footer></body></html>',
    );
  });

  it('records every template a page rendered, the layout first, and the names it looked up', async () => {
    await site.build();
    const entry = (await site.manifest()).entries['/blog/first.html']!;
    const srcDir = posix(`${site.dir}/site`);

    expect(entry.templatesRecorded).toBe(true);
    expect(entry.deps[0]).toBe(`${srcDir}/blog/layout.eta`);
    expect(sorted(entry.deps.map((dep) => dep.slice(srcDir.length + 1)))).toEqual([
      'base.eta',
      'blog/layout.eta',
      'partials/callout.eta',
      'partials/footer.eta',
      'partials/frame.eta',
      'partials/header.eta',
    ]);
    expect(entry.templateLookups).toEqual(
      expect.arrayContaining([
        { name: 'layout', from: 'blog', file: 'blog/layout.eta' },
        { name: 'base', from: 'blog', file: 'base.eta' },
        { name: 'partials/callout', from: 'blog', file: 'partials/callout.eta' },
        { name: '/partials/frame', file: 'partials/frame.eta' },
        { name: 'partials/promo', from: 'blog', file: null },
      ]),
    );
    // The draft include did not render, so it is not a dependency
    expect(entry.deps.some((dep) => dep.endsWith('draft.eta'))).toBe(false);
  });

  it('reuses every page when nothing changed', async () => {
    await site.build();
    const second = await site.build();

    expect(second.rendered).toEqual([]);
    expect(second.cached).toHaveLength(4);
  });

  it.each([
    ['the shell', 'site/base.eta', ['/', '/about', '/blog/first', '/blog/second']],
    ['a section layout', 'site/blog/layout.eta', ['/blog/first', '/blog/second']],
    ['an include', 'site/partials/footer.eta', ['/', '/about', '/blog/first', '/blog/second']],
    ['a component', 'site/partials/callout.eta', ['/blog/first', '/blog/second']],
    ["a component's frame", 'site/partials/frame.eta', ['/blog/first', '/blog/second']],
  ])('rebuilds the pages that rendered %s when it changes', async (_, file, pages) => {
    await site.build();
    await site.write(file, `${await site.read(file)}<!-- edited -->`);

    expect(sorted((await site.build()).rendered)).toEqual(pages);
  });

  it('rebuilds nothing when a template no page rendered changes', async () => {
    await site.build();
    await site.write('site/partials/unused.eta', 'Still unused');
    await site.write('site/partials/draft.eta', '<p>Draft, edited</p>');

    expect((await site.build()).rendered).toEqual([]);
  });

  it('rebuilds only the pages a new section override applies to', async () => {
    await site.build();
    await site.write('site/blog/partials/header.eta', '<header>Blog</header>');

    expect(sorted((await site.build()).rendered)).toEqual(['/blog/first', '/blog/second']);
    expect(await site.read('dist/blog/first.html')).toContain('<header>Blog</header>');
    expect(await site.read('dist/about.html')).toContain('<header>Site</header>');
  });

  it('rebuilds the pages whose stati.include.has() check now finds a file', async () => {
    await site.build();
    await site.write('site/partials/promo.eta', '<p>Promo</p>');

    expect(sorted((await site.build()).rendered)).toEqual(['/blog/first', '/blog/second']);
    expect(await site.read('dist/blog/second.html')).toContain('<p>Promo</p>');
  });

  it('rebuilds the pages that used a deleted template', async () => {
    await site.write('site/blog/partials/header.eta', '<header>Blog</header>');
    await site.build();
    await site.remove('site/blog/partials/header.eta');

    expect(sorted((await site.build()).rendered)).toEqual(['/blog/first', '/blog/second']);
    expect(await site.read('dist/blog/first.html')).toContain('<header>Site</header>');
  });

  it('rebuilds the pages a new section layout.eta applies to', async () => {
    await site.build();
    await site.write('site/docs/intro.md', page({ title: 'Intro' }, 'Intro'));
    await site.build();
    await site.write('site/docs/layout.eta', `<% stati.layout('base') %><section>docs</section>`);

    expect((await site.build()).rendered).toEqual(['/docs/intro']);
    expect(await site.read('dist/docs/intro.html')).toContain('<section>docs</section>');
  });

  it('records an include that renders after its condition starts to hold', async () => {
    await site.build();
    await site.write('site/blog/first.md', page({ title: 'First', draft: true }, 'First'));
    await site.build({ includeDrafts: true });
    const entry = (await site.manifest()).entries['/blog/first.html']!;
    expect(entry.deps.some((dep) => dep.endsWith('partials/draft.eta'))).toBe(true);

    await site.write('site/partials/draft.eta', '<p>Draft, edited</p>');
    expect((await site.build({ includeDrafts: true })).rendered).toEqual(['/blog/first']);
  });

  it('keeps a page that includes an empty template cached', async () => {
    await site.write('site/partials/footer.eta', '');
    await site.build();

    expect((await site.build()).rendered).toEqual([]);
  });

  it('rebuilds once the entries an older Stati wrote', async () => {
    await site.build();
    const manifest = await site.manifest();
    for (const entry of Object.values(manifest.entries)) {
      delete entry.templatesRecorded;
      delete entry.templateLookups;
    }
    await site.saveManifest(manifest);

    expect((await site.build()).rendered).toHaveLength(4);
    expect((await site.build()).rendered).toEqual([]);
  });

  it('records the failing template of a production render, so fixing it rebuilds the page', async () => {
    await site.write(
      'site/partials/footer.eta',
      '<footer><%= stati.page.missing.value %></footer>',
    );
    const failed = await site.build({ allowErrors: true });
    expect(failed.errors).toHaveLength(4);
    expect(await site.read('dist/about.html')).toContain(
      '<!-- Error rendering site/partials/footer.eta',
    );

    await site.write('site/partials/footer.eta', '<footer>Fixed</footer>');
    const fixed = await site.build();
    expect(fixed.rendered).toHaveLength(4);
    expect(await site.read('dist/about.html')).toContain('<footer>Fixed</footer>');
  });

  it('records a failing layout, so fixing it rebuilds the fallback page', async () => {
    await site.write(
      'site/layout.eta',
      `<% stati.layout('base') %><%= stati.page.missing.value %>`,
    );
    const failed = await site.build({ allowErrors: true });
    expect(sorted(failed.errors)).toEqual([
      expect.stringContaining('Error rendering site/layout.eta for /:'),
      expect.stringContaining('Error rendering site/layout.eta for /about:'),
    ]);
    expect(await site.read('dist/about.html')).toContain('<!DOCTYPE html>');

    await site.write('site/layout.eta', `<% stati.layout('base') %><main>fixed</main>`);
    expect(sorted((await site.build()).rendered)).toEqual(['/', '/about']);
  });

  it('records an unknown name, so adding the file rebuilds the page', async () => {
    await site.write('site/about.md', page({ title: 'About', layout: 'about' }, 'About'));
    await site.write(
      'site/about.eta',
      `<% stati.layout('base') %><%~ stati.include('partials/team') %>`,
    );
    const first = await site.build({ allowErrors: true });
    expect(first.errors).toEqual([
      expect.stringContaining(
        "stati.include('partials/team'): no template at site/partials/team.eta",
      ),
    ]);

    await site.write('site/partials/team.eta', '<p>Team</p>');
    expect((await site.build()).rendered).toEqual(['/about']);
    expect(await site.read('dist/about.html')).toContain('<p>Team</p>');
  });

  it('rebuilds a page whose front matter layout finds a new section file', async () => {
    await site.write('site/blog/first.md', page({ title: 'First', layout: 'post' }, 'First'));
    await site.write('site/post.eta', `<% stati.layout('base') %><div>root post</div>`);
    await site.build();
    expect(await site.read('dist/blog/first.html')).toContain('root post');

    await site.write('site/blog/post.eta', `<% stati.layout('base') %><div>blog post</div>`);
    const second = await site.build();

    expect(second.rendered).toEqual(['/blog/first']);
    expect(await site.read('dist/blog/first.html')).toContain('blog post');
    expect(second.warnings).toEqual([]);
  });
});
