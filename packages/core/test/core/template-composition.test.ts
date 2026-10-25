/**
 * stati.layout(), stati.include(), stati.body, stati.props and stati.helpers, rendered by real
 * builds of temporary sites, plus the template recording the ISG cache relies on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { loadConfig } from '../../src/config/loader.js';
import { setEnv } from '../../src/env.js';
import { clearTemplateEngineCache } from '../../src/core/templates.js';
import { MAX_TEMPLATE_DEPTH } from '../../src/core/template-render.js';
import type { StatiConfig } from '../../src/types/index.js';
import { createSiteFixture, page, type SiteFixture } from './site-fixture.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

/** The rendered HTML between <body> and </body>, without the SEO tags in <head> */
function body(html: string): string {
  return html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'));
}

const SHELL = '<html><head></head><body><%~ stati.body %></body></html>';

describe('template composition', () => {
  let site: SiteFixture;

  async function setup(config: Partial<StatiConfig> = {}) {
    site = await createSiteFixture(vi.mocked(loadConfig), {
      seo: { autoInject: false },
      ...config,
    });
    await site.write('site/index.md', page({ title: 'Home' }, '# Home'));
  }

  beforeEach(() => {
    setEnv('production');
  });

  afterEach(async () => {
    clearTemplateEngineCache();
    setEnv('test');
    await site?.cleanup();
  });

  describe('stati.layout()', () => {
    beforeEach(() => setup());

    it('wraps a template in the parents it names, passing props and the wrapped output', async () => {
      await site.write(
        'site/base.eta',
        `<html><head></head><body class="<%= stati.props?.bodyClass ?? '' %>"><%~ stati.body %></body></html>`,
      );
      await site.write(
        'site/blog/base.eta',
        `<% stati.layout('/base', { bodyClass: stati.props.section }) %><section><%~ stati.body %></section>`,
      );
      await site.write(
        'site/blog/layout.eta',
        `<% stati.layout('base', { section: 'blog' }) %><article><%~ stati.content %></article>`,
      );
      await site.write(
        'site/layout.eta',
        `<% stati.layout('base') %><main><%~ stati.content %></main>`,
      );
      await site.write('site/blog/post.md', page({ title: 'Post' }, 'Post body'));
      await site.build();

      expect(await site.read('dist/blog/post.html')).toContain(
        '<body class="blog"><section><article><p>Post body</p>\n</article></section></body>',
      );
      // The root layout looks up "base" from the site root
      expect(await site.read('dist/index.html')).toContain(
        '<body class=""><main><h1>Home</h1>\n</main></body>',
      );
    });

    it('can be called anywhere in the template, and prints nothing', async () => {
      await site.write('site/base.eta', SHELL);
      await site.write('site/layout.eta', `<p>first</p><%~ stati.layout('base') %><p>last</p>`);
      await site.build();

      expect(body(await site.read('dist/index.html'))).toBe('<p>first</p><p>last</p>');
    });

    it('reports stati.layout.has() with the same lookup', async () => {
      await site.write('site/base.eta', SHELL);
      await site.write(
        'site/layout.eta',
        `<% stati.layout(stati.layout.has('blog/base') ? 'blog/base' : 'base') %><%= stati.layout.has('base') %>,<%= stati.layout.has('blog/base') %>`,
      );
      await site.build();

      expect(body(await site.read('dist/index.html'))).toBe('true,false');
    });

    it('logs an unknown name in production and renders the template unwrapped', async () => {
      await site.write('site/layout.eta', `<% stati.layout('bse') %><main>content</main>`);
      await site.write('site/base.eta', SHELL);
      const { errors } = await site.build({ allowErrors: true });

      expect(errors).toEqual([
        expect.stringContaining(
          `stati.layout('bse'): no template at site/bse.eta. Did you mean "base"? (page /)`,
        ),
      ]);
      expect(await site.read('dist/index.html')).toBe('<main>content</main>');
    });

    it('warns about a second call in one template and uses the last one', async () => {
      await site.write('site/a.eta', '<a><%~ stati.body %></a>');
      await site.write('site/b.eta', '<b><%~ stati.body %></b>');
      await site.write('site/layout.eta', `<% stati.layout('a') %><% stati.layout('b') %>x`);
      const { warnings } = await site.build();

      expect(warnings).toContainEqual(
        expect.stringContaining("stati.layout('b'): site/layout.eta already called stati.layout()"),
      );
      expect(await site.read('dist/index.html')).toBe('<b>x</b>');
    });

    it('ignores a call made after its template finished rendering', async () => {
      // A helper keeps an include's stati.layout and calls it once the include has rendered
      let kept: ((name: string) => string) | undefined;
      await site.cleanup();
      await setup({
        helpers: {
          keep: (layout: (name: string) => string) => {
            kept = layout;
          },
          callKept: (name: string) => kept?.(name),
        },
      });
      await site.write('site/base.eta', '<w><%~ stati.body %></w>');
      await site.write('site/partials/late.eta', '<% stati.helpers.keep(stati.layout) %>late');
      await site.write(
        'site/layout.eta',
        `<%~ stati.include('partials/late') %><% stati.helpers.callKept('base') %>`,
      );
      const { warnings } = await site.build();

      expect(warnings).toContainEqual(
        expect.stringContaining(
          "stati.layout('base') was called after site/partials/late.eta finished rendering",
        ),
      );
      expect(await site.read('dist/index.html')).toBe('late');
    });
  });

  describe('stati.include()', () => {
    beforeEach(() => setup());

    it('renders a template with props and children, and a component with a frame', async () => {
      await site.write(
        'site/partials/callout.eta',
        `<% stati.layout('./frame', { kind: stati.props.tone }) %><aside class="<%= stati.props.tone %>"><%~ stati.body %></aside>`,
      );
      await site.write(
        'site/partials/frame.eta',
        '<div class="frame-<%= stati.props.kind %>"><%~ stati.body %></div>',
      );
      await site.write('site/partials/note.eta', '<em>note</em>');
      await site.write(
        'site/layout.eta',
        `<%~ stati.include('partials/callout', { tone: 'warning' }, stati.include('partials/note')) %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe(
        '<div class="frame-warning"><aside class="warning"><em>note</em></aside></div>',
      );
    });

    it('renders nothing for a template that returns early', async () => {
      await site.write(
        'site/partials/pager.eta',
        `<% if (!stati.props?.pages) { return; } %><nav><%= stati.props.pages %></nav>`,
      );
      await site.write(
        'site/layout.eta',
        `[<%~ stati.include('partials/pager') %>][<%~ stati.include('partials/pager', { pages: 2 }) %>]`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe('[][<nav>2</nav>]');
    });

    it("keeps a component's stati.layout() out of the page's own parent", async () => {
      await site.write('site/base.eta', '<page><%~ stati.body %></page>');
      await site.write('site/partials/framed.eta', `<% stati.layout('./frame') %>inner`);
      await site.write('site/partials/frame.eta', '<frame><%~ stati.body %></frame>');
      await site.write(
        'site/layout.eta',
        `<% stati.layout('base') %><%~ stati.include('partials/framed') %>|<%~ stati.include('partials/framed') %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe(
        '<page><frame>inner</frame>|<frame>inner</frame></page>',
      );
    });

    it('resolves looked-up, root and relative names, and drops an .eta suffix', async () => {
      await site.write('site/partials/name.eta', 'root');
      await site.write('site/blog/partials/name.eta', 'section');
      await site.write('site/partials/icons/arrow.eta', 'arrow');
      await site.write(
        'site/blog/partials/card.eta',
        `<%~ stati.include('../../partials/icons/arrow') %>`,
      );
      await site.write(
        'site/layout.eta',
        [
          `<%~ stati.include('partials/name') %>`,
          `<%~ stati.include('/partials/name') %>`,
          `<%~ stati.include('./partials/name.eta') %>`,
          `<%~ stati.include('partials/card') %>`,
        ].join(','),
      );
      await site.write('site/blog/post.md', page({ title: 'Post' }));
      await site.build({ allowErrors: true });

      expect(await site.read('dist/blog/post.html')).toBe('section,root,root,arrow');
      // ./ is relative to the template, not to the page
      expect(await site.read('dist/index.html')).toBe('root,root,root,');
    });

    it('caches an include without props for the page, keyed by template and context', async () => {
      const counts: Record<string, number> = {};
      await setupWithHelpers({
        count: (name: string) => {
          counts[name] = (counts[name] ?? 0) + 1;
          return '';
        },
      });
      await site.write('site/partials/header.eta', `<%= stati.helpers.count('header') %>H`);
      await site.write(
        'site/partials/card.eta',
        `<%= stati.helpers.count('card') %><%= stati.props.title %>`,
      );
      await site.write(
        'site/layout.eta',
        `<%~ stati.include('partials/header') %><%~ stati.include('partials/header') %><%~ stati.include('partials/card', { title: 'a' }) %><%~ stati.include('partials/card', { title: 'b' }) %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe('HHab');
      expect(counts).toEqual({ header: 1, card: 2 });
    });

    it('renders a recursive component that passes props, up to a depth limit', async () => {
      await site.write(
        'site/partials/tree.eta',
        `<ul><% for (const node of stati.props.nodes) { %><li><%= node.name %><% if (node.children) { %><%~ stati.include('./tree', { nodes: node.children }) %><% } %></li><% } %></ul>`,
      );
      await site.write(
        'site/layout.eta',
        `<%~ stati.include('partials/tree', { nodes: [{ name: 'a', children: [{ name: 'b', children: [{ name: 'c' }] }] }] }) %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe(
        '<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>',
      );

      await site.write(
        'site/partials/forever.eta',
        `x<%~ stati.include('./forever', { again: true }) %>`,
      );
      await site.write(
        'site/layout.eta',
        `<%~ stati.include('partials/forever', { again: true }) %>`,
      );
      const { errors } = await site.build({ allowErrors: true });
      expect(errors).toContainEqual(
        expect.stringContaining(`templates are nested more than ${MAX_TEMPLATE_DEPTH} deep`),
      );
      // The layout counts towards the depth
      expect(await site.read('dist/index.html')).toBe('x'.repeat(MAX_TEMPLATE_DEPTH - 1));
    });

    it('logs a runtime error in an include and leaves a comment in its place', async () => {
      await site.write('site/partials/broken.eta', '<%= stati.page.missing.deep %>');
      await site.write('site/layout.eta', `before<%~ stati.include('partials/broken') %>after`);
      const { errors } = await site.build({ allowErrors: true });

      expect(errors).toEqual([
        expect.stringMatching(
          /^Error rendering site\/partials\/broken\.eta for \/: Cannot read properties of undefined/,
        ),
      ]);
      expect(await site.read('dist/index.html')).toMatch(
        /^before<!-- Error rendering site\/partials\/broken\.eta: Cannot read .* -->after$/,
      );
    });

    it('keeps an error message from ending its comment early', async () => {
      await site.write('site/partials/broken.eta', `<% throw new Error('a ---> b <!-- c') %>`);
      await site.write('site/layout.eta', `before<%~ stati.include('partials/broken') %>after`);
      await site.build({ allowErrors: true });

      const html = await site.read('dist/index.html');
      expect(html).toBe(
        'before<!-- Error rendering site/partials/broken.eta: a - - -> b <!- - c -->after',
      );
    });

    it('renders nothing for an unknown name in production and logs it with suggestions', async () => {
      await site.write('site/_partials/header.eta', 'H');
      await site.write('site/layout.eta', `[<%~ stati.include('header') %>]`);
      const { errors } = await site.build({ allowErrors: true });

      expect(errors).toEqual([
        expect.stringContaining(
          `stati.include('header'): no template at site/header.eta. Did you mean "_partials/header"?`,
        ),
      ]);
      expect(await site.read('dist/index.html')).toBe('[]');
    });

    it('names the one file it tried for an unknown path', async () => {
      await site.write('site/partials/header.eta', 'H');
      await site.write('site/layout.eta', `[<%~ stati.include('/partials/headr') %>]`);
      const { errors } = await site.build({ allowErrors: true });

      expect(errors).toEqual([
        expect.stringContaining(
          `stati.include('/partials/headr'): no template at site/partials/headr.eta. Did you mean "/partials/header"?`,
        ),
      ]);
      expect(await site.read('dist/index.html')).toBe('[]');
    });

    it('reports an included template that uses await, and renders it empty', async () => {
      await site.write('site/partials/slow.eta', '<%= await Promise.resolve(1) %>');
      await site.write('site/layout.eta', `[<%~ stati.include('partials/slow') %>]`);
      const { errors } = await site.build({ allowErrors: true });

      expect(errors).toEqual([
        expect.stringContaining(
          'site/partials/slow.eta uses await, but templates rendered by stati.include() render synchronously',
        ),
      ]);
      expect(await site.read('dist/index.html')).toBe('[]');
    });

    it('drops props that are not an object and a body that is not a string, with a warning', async () => {
      await site.write(
        'site/partials/show.eta',
        `<%= JSON.stringify(stati.props) %>|<%= String(stati.body) %>`,
      );
      await site.write(
        'site/layout.eta',
        `<%~ stati.include('partials/show', 'oops') %>;<%~ stati.include('partials/show', null, 42) %>`,
      );
      const { warnings } = await site.build();

      expect(warnings).toContainEqual(
        expect.stringContaining(
          "stati.include('partials/show', props): props must be an object, not a string",
        ),
      );
      expect(warnings).toContainEqual(
        expect.stringContaining('body must be a string of HTML, not a number'),
      );
      expect(await site.read('dist/index.html')).toBe('undefined|undefined;undefined|undefined');
    });

    it('answers stati.include.has() with the lookup the call would use', async () => {
      await site.write('site/partials/a.eta', 'A');
      await site.write('site/blog/partials/b.eta', 'B');
      const names = [
        'partials/a',
        '/partials/a',
        './partials/a',
        'partials/b',
        'partials/c',
        '../x',
        42,
      ];
      await site.write(
        'site/layout.eta',
        `<% for (const name of ${JSON.stringify(names)}) { %><%= name %>=<%= stati.include.has(name) %>:<%~ stati.include.has(name) ? stati.include(name) : '-' %>;<% } %>`,
      );
      await site.write('site/blog/post.md', page({ title: 'Post' }));
      await site.build({ allowErrors: true });

      expect(await site.read('dist/blog/post.html')).toBe(
        'partials/a=true:A;/partials/a=true:A;./partials/a=true:A;partials/b=true:B;partials/c=false:-;../x=false:-;42=false:-;',
      );
    });

    async function setupWithHelpers(helpers: NonNullable<StatiConfig['helpers']>) {
      await site.cleanup();
      await setup({ helpers });
    }
  });

  describe('cycles', () => {
    beforeEach(() => setup());

    it.each([
      [
        'through includes',
        {
          'site/layout.eta': `<%~ stati.include('a') %>`,
          'site/a.eta': `a<%~ stati.include('b') %>`,
          'site/b.eta': `b<%~ stati.include('a') %>`,
        },
        'site/layout.eta → site/a.eta → site/b.eta → site/a.eta',
        'ab',
      ],
      [
        'through parents',
        {
          'site/layout.eta': `<% stati.layout('a') %>l`,
          'site/a.eta': `<% stati.layout('b') %>a<%~ stati.body %>`,
          'site/b.eta': `<% stati.layout('layout') %>b<%~ stati.body %>`,
        },
        'site/layout.eta → site/a.eta → site/b.eta → site/layout.eta',
        'bal',
      ],
      [
        'through a parent and an include',
        {
          'site/layout.eta': `<% stati.layout('base') %>l`,
          'site/base.eta': `<%~ stati.body %><%~ stati.include('layout') %>`,
        },
        'site/layout.eta → site/base.eta → site/layout.eta',
        'l',
      ],
    ])(
      'logs a cycle %s, naming the chain, and skips the repeated template',
      async (_, files, chain, html) => {
        for (const [path, content] of Object.entries(files)) {
          await site.write(path, content);
        }
        const { errors } = await site.build({ allowErrors: true });

        expect(errors).toEqual([expect.stringContaining(chain)]);
        expect(await site.read('dist/index.html')).toBe(html);
      },
    );
  });

  describe('stati.body and stati.props', () => {
    beforeEach(() => setup());

    it("are absent and undefined in the page's layout, and set by the call elsewhere", async () => {
      await site.write(
        'site/partials/probe.eta',
        `[<%= 'body' in stati %>,<%= stati.body %>,<%= JSON.stringify(stati.props) %>]`,
      );
      await site.write('site/base.eta', `<%~ stati.body %><%= JSON.stringify(stati.props) %>`);
      await site.write(
        'site/layout.eta',
        `<% stati.layout('base', { from: 'layout' }) %>[<%= 'body' in stati %>,<%= stati.props %>]<%~ stati.include('partials/probe') %><%~ stati.include('partials/probe', { x: 1 }, '<b>c</b>') %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe(
        '[false,undefined][true,undefined,undefined][true,&lt;b&gt;c&lt;/b&gt;,{&quot;x&quot;:1}]{&quot;from&quot;:&quot;layout&quot;}',
      );
    });
  });

  describe('helpers', () => {
    it('reaches layouts, parents and components, with the helpers object as this', async () => {
      await setup({
        helpers: {
          shout: (text: string) => text.toUpperCase(),
          twice(this: Record<string, (text: string) => string>, text: string) {
            return this.shout!(text) + this.shout!(text);
          },
          page: () => 'helper page',
          image: () => 'helper image',
        },
      });
      await site.write('site/base.eta', `<%= stati.helpers.shout('base') %>:<%~ stati.body %>`);
      await site.write('site/partials/c.eta', `<%= stati.helpers.twice('c') %>`);
      await site.write(
        'site/layout.eta',
        `<% stati.layout('base') %><%= stati.helpers.shout('layout') %>,<%~ stati.include('partials/c') %>,<%= stati.page.title %>,<%= typeof stati.image %>,<%= stati.helpers.page() %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe('BASE:LAYOUT,CC,Home,function,helper page');
    });

    it('is not on the root of stati: a root-level call fails in production', async () => {
      await setup({ helpers: { shout: (text: string) => text.toUpperCase() } });
      await site.write('site/layout.eta', `<%= stati.shout('x') %>`);
      const { errors } = await site.build({ allowErrors: true });

      expect(errors).toEqual([
        expect.stringContaining(
          'Error rendering site/layout.eta for /: stati.shout is not a function',
        ),
      ]);
    });
  });

  describe('adjacent tags', () => {
    beforeEach(() => setup());

    it('render in production when no semicolon separates them', async () => {
      await site.write(
        'site/layout.eta',
        '<html><head></head><body>\n' +
          '<% const tags = stati.page.tags %>\n' +
          '<% (tags || []).forEach((tag) => { %><li><%= tag %></li><% }) %>\n' +
          '<%~ stati.content %></body></html>',
      );
      await site.write('site/tagged.md', page({ title: 'Tagged', tags: ['a', 'b'] }, 'Text'));

      // build() fails on a logged error, so a layout that falls back to the plain document throws
      await site.build();
      expect(await site.read('dist/tagged.html')).toContain('<li>a</li><li>b</li>');
    });
  });

  describe("Eta's own functions", () => {
    beforeEach(() => setup());

    it.each([
      ['include', `<%~ include('./x', { a: 1 }) %>`, "Use stati.include('./x', data) instead"],
      [
        'includeAsync',
        `<%~ await includeAsync('x') %>`,
        "Use stati.include('./x') instead; templates rendered by stati.include() render synchronously",
      ],
      [
        'layout',
        `<% layout('/base', { a: 1 }) %>`,
        "Use stati.layout('/base', data) instead; the data arrives as stati.props",
      ],
      [
        'block',
        `<%~ block('sidebar', () => { %>s<% }) %>`,
        'Pass the content to the layout as a prop instead',
      ],
      [
        'blockAsync',
        `<%~ await blockAsync('sidebar') %>`,
        'Pass the content to the layout as a prop instead',
      ],
    ])(
      'logs %s() in production, naming the replacement, and renders nothing',
      async (name, call, replacement) => {
        await site.write('site/x.eta', 'X');
        await site.write('site/base.eta', SHELL);
        await site.write('site/layout.eta', `[${call}]`);
        const { errors } = await site.build({ allowErrors: true });

        expect(errors).toEqual([
          expect.stringContaining(
            `site/layout.eta: Eta's ${name}() is not available in Stati templates. ${replacement}`,
          ),
        ]);
        expect(errors[0]).toContain('(page /)');
        expect(await site.read('dist/index.html')).toBe('[]');
      },
    );

    it("lets templates declare names that Eta's own functions use", async () => {
      await site.write(
        'site/layout.eta',
        `<% const block = (n) => n * 2; const output = 'o'; const layout = 'l'; const include = 'i'; %><%= block(2) %><%= output %><%= layout %><%= include %>`,
      );
      await site.build();

      expect(await site.read('dist/index.html')).toBe('4oli');
    });
  });

  describe('development', () => {
    beforeEach(async () => {
      setEnv('development');
      await setup();
    });

    /** Builds in development and returns the error the overlay shows */
    async function overlayError() {
      clearTemplateEngineCache();
      // Development logs the error, then throws it for the overlay
      const error = await site.build({ allowErrors: true }).then(
        () => undefined,
        (caught: unknown) =>
          caught as { filePath?: string; line?: number; message: string; suggestions?: string[] },
      );
      expect(error).toBeDefined();
      return error!;
    }

    it('points the overlay at the call with an unknown name, with suggestions', async () => {
      await site.write('site/partials/header.eta', 'H');
      await site.write('site/layout.eta', `<p>\n<%~ stati.include('partials/hedaer') %>\n</p>`);

      const error = await overlayError();
      expect(error.filePath).toBe(join(site.dir, 'site', 'layout.eta'));
      expect(error.line).toBe(2);
      expect(error.message).toContain(
        "stati.include('partials/hedaer'): no template at site/partials/hedaer.eta",
      );
      expect(error.suggestions).toContain('Did you mean "partials/header"?');
    });

    it('points the overlay at the failing included file, not at the include', async () => {
      await site.write(
        'site/partials/card.eta',
        '<div>\n<%= stati.helpers.fromatDate(1) %>\n</div>',
      );
      await site.write('site/base.eta', SHELL);
      await site.write(
        'site/layout.eta',
        `<% stati.layout('base') %>\n<%~ stati.include('partials/card', { title: 'x' }) %>`,
      );

      const error = await overlayError();
      expect(error.filePath).toBe(join(site.dir, 'site', 'partials', 'card.eta'));
      expect(error.line).toBe(2);
      expect(error.message).toBe('Unknown property "stati.helpers.fromatDate"');
    });

    it('validates parents, suggesting stati.helpers for a root-level helper', async () => {
      await site.cleanup();
      await setup({ helpers: { formatDate: () => 'today' } });
      await site.write(
        'site/base.eta',
        '<html><body>\n<%= stati.formatDate() %><%~ stati.body %></body></html>',
      );
      await site.write('site/layout.eta', `<% stati.layout('base') %>x`);

      const error = await overlayError();
      expect(error.filePath).toBe(join(site.dir, 'site', 'base.eta'));
      expect(error.line).toBe(2);
      expect(error.suggestions).toEqual(['Did you mean "stati.helpers.formatDate"?']);
    });

    it('reports a property the context does not have, such as stati.partials', async () => {
      await site.write('site/layout.eta', '<%~ stati.partials.header %>');

      const error = await overlayError();
      expect(error.message).toBe('Unknown property "stati.partials"');
      expect(error.suggestions?.[0]).toMatch(/^Available properties on stati: assets, /);
    });

    it("explains stati.body in the page's layout", async () => {
      await site.write('site/layout.eta', '<%~ stati.body %>');

      const error = await overlayError();
      expect(error.message).toBe('Unknown property "stati.body"');
      expect(error.suggestions?.[0]).toContain("the page's Markdown is stati.content");
    });

    it("shows the overlay for Eta's own include() at the calling line", async () => {
      await site.write('site/x.eta', 'X');
      await site.write('site/layout.eta', `<p>\n<%~ include('x') %>\n</p>`);

      const error = await overlayError();
      expect(error.filePath).toBe(join(site.dir, 'site', 'layout.eta'));
      expect(error.line).toBe(2);
      expect(error.suggestions).toEqual(["Use stati.include('./x')"]);
    });

    it.each([
      [
        'a second stati.layout()',
        `<% stati.layout('base') %><% stati.layout('base') %>`,
        'already called stati.layout()',
      ],
      [
        'props that are not an object',
        `<%~ stati.include('base', [1]) %>`,
        'props must be an object, not an array',
      ],
      ['a cycle', `<%~ stati.include('layout') %>`, 'site/layout.eta → site/layout.eta'],
      [
        'a name outside the source directory',
        `<%~ stati.include('../outside') %>`,
        'resolves outside the source directory',
      ],
    ])('throws for %s', async (_, layout, message) => {
      await site.write('site/base.eta', SHELL);
      await site.write('site/layout.eta', layout);

      expect((await overlayError()).message).toContain(message);
    });

    it('throws for await in an include, pointing at the included file', async () => {
      await site.write('site/partials/slow.eta', '<p>\n<%= await Promise.resolve(1) %>\n</p>');
      await site.write('site/layout.eta', `<%~ stati.include('partials/slow') %>`);

      const error = await overlayError();
      expect(error.filePath).toBe(join(site.dir, 'site', 'partials', 'slow.eta'));
      expect(error.line).toBe(2);
      expect(error.message).toContain('render synchronously');
    });
  });
});
