/**
 * A page that fails to render in production is written as fallback HTML (or with an error
 * comment where an include failed). It must not be served from the cache afterwards: every
 * build renders it again and logs the error again, until the template is fixed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

describe('pages that fail to render', () => {
  let site: SiteFixture;

  beforeEach(async () => {
    setEnv('production');
    site = await createSiteFixture(vi.mocked(loadConfig), { seo: { autoInject: false } });
    await site.write('site/layout.eta', '<html><body><%~ stati.content %></body></html>');
    await site.write('site/index.md', page({ title: 'Home' }, 'Home'));
    await site.write('site/bad.md', page({ title: 'Bad', layout: 'broken' }, 'Bad'));
    await site.write('site/broken.eta', '<html><body><%= stati.page.missing.x %></body></html>');
  });

  afterEach(async () => {
    setEnv('test');
    await site.cleanup();
    vi.restoreAllMocks();
  });

  it('renders a failing layout and logs its error on every build', async () => {
    const first = await site.build({ allowErrors: true });
    expect(first.errors).toEqual([expect.stringContaining('Error rendering site/broken.eta')]);

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual(['/bad']);
    expect(second.cached).toEqual(['/']);
    expect(second.errors).toEqual([expect.stringContaining('Error rendering site/broken.eta')]);

    const third = await site.build({ allowErrors: true });
    expect(third.rendered).toEqual(['/bad']);
    expect(third.errors).toHaveLength(1);
  });

  it('renders a page whose include fails on every build', async () => {
    await site.write(
      'site/broken.eta',
      '<html><body><%~ stati.include("partials/bad") %></body></html>',
    );
    await site.write('site/partials/bad.eta', '<p><%= stati.page.missing.x %></p>');

    const first = await site.build({ allowErrors: true });
    expect(first.errors).toEqual([
      expect.stringContaining('Error rendering site/partials/bad.eta'),
    ]);
    expect(await site.read('dist/bad.html')).toContain('<!-- Error rendering');

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual(['/bad']);
    expect(second.errors).toEqual([
      expect.stringContaining('Error rendering site/partials/bad.eta'),
    ]);
  });

  it('renders a page whose include uses await on every build', async () => {
    await site.write(
      'site/broken.eta',
      '<html><body><%~ stati.include("partials/wait") %></body></html>',
    );
    await site.write('site/partials/wait.eta', '<p><%= await Promise.resolve(1) %></p>');

    const first = await site.build({ allowErrors: true });
    expect(first.errors).toHaveLength(1);

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual(['/bad']);
    expect(second.errors).toHaveLength(1);
  });

  it.each([
    ['an include that names no template', '<%~ stati.include("partials/nope") %>'],
    ['an include with an invalid name', '<%~ stati.include(42) %>'],
    ['a layout that names no template', '<% stati.layout("nope") %>'],
  ])('renders a page with %s on every build', async (_label, body) => {
    await site.write('site/broken.eta', `<html><body>${body}</body></html>`);

    const first = await site.build({ allowErrors: true });
    expect(first.errors).toHaveLength(1);

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual(['/bad']);
    expect(second.cached).toEqual(['/']);
    expect(second.errors).toHaveLength(1);
  });

  it("renders a page that calls Eta's own include() on every build", async () => {
    await site.write('site/partials/card.eta', '<p>card</p>');
    await site.write(
      'site/broken.eta',
      "<html><body><%~ include('./partials/card') %></body></html>",
    );

    const first = await site.build({ allowErrors: true });
    expect(first.errors).toEqual([expect.stringContaining("Eta's include() is not available")]);

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual(['/bad']);
    expect(second.errors).toHaveLength(1);
  });

  it('renders a page whose includes lead back to themselves on every build', async () => {
    await site.write(
      'site/broken.eta',
      '<html><body><%~ stati.include("partials/loop") %></body></html>',
    );
    await site.write('site/partials/loop.eta', '<%~ stati.include("partials/loop") %>');

    const first = await site.build({ allowErrors: true });
    expect(first.errors).toHaveLength(1);

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual(['/bad']);
    expect(second.errors).toHaveLength(1);
  });

  it('keeps caching a page that only logs warnings', async () => {
    await site.write(
      'site/broken.eta',
      '<html><body><%~ stati.include("partials/card", "not props") %></body></html>',
    );
    await site.write('site/partials/card.eta', '<p>card</p>');

    const first = await site.build({ allowErrors: true });
    expect(first.errors).toEqual([]);
    expect(first.warnings).toHaveLength(1);

    const second = await site.build({ allowErrors: true });
    expect(second.rendered).toEqual([]);
  });

  it('renders again when a page that rendered before starts to fail', async () => {
    await site.write('site/broken.eta', '<html><body>fine</body></html>');
    await site.build();

    await site.write('site/broken.eta', '<html><body><%= stati.page.missing.x %></body></html>');
    const failed = await site.build({ allowErrors: true });
    expect(failed.rendered).toEqual(['/bad']);
    expect(failed.errors).toHaveLength(1);

    const again = await site.build({ allowErrors: true });
    expect(again.rendered).toEqual(['/bad']);
    expect(again.errors).toHaveLength(1);
  });

  it('caches the page again once the template is fixed', async () => {
    await site.build({ allowErrors: true });
    await site.write('site/broken.eta', '<html><body>fixed</body></html>');

    const fixed = await site.build();
    expect(fixed.rendered).toEqual(['/bad']);
    expect(await site.read('dist/bad.html')).toContain('fixed');

    const next = await site.build();
    expect(next.rendered).toEqual([]);
    expect([...next.cached].sort()).toEqual(['/', '/bad']);
  });

  it('keeps the failed page in the manifest so its output can be pruned', async () => {
    await site.build({ allowErrors: true });
    const manifest = await site.manifest();
    expect(manifest.entries['/bad.html']).toBeDefined();
  });
});
