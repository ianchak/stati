import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

const originalCwd = process.cwd();
const requireFromProject = createRequire(join(originalCwd, 'package.json'));
const coreUrl = pathToFileURL(requireFromProject.resolve('@stati/core'));
const { build, setEnv, getEnv, clearConfigCache } = await import(coreUrl.href);
const originalEnv = getEnv();
const starter = fileURLToPath(new URL('../assets/starter/', import.meta.url));
const fixture = await mkdtemp(join(tmpdir(), 'stati-skill-smoke-'));
const diagnostics = [];
const logger = Object.fromEntries(
  ['info', 'success', 'warning', 'error', 'status', 'building', 'processing', 'stats'].map(
    (level) => [
      level,
      (...args) => {
        if (level === 'warning' || level === 'error') diagnostics.push({ level, args });
      },
    ],
  ),
);
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

function checkHtml(html, label) {
  check(
    !/Error rendering partial|Stati Development Error Overlay|Template Error/.test(html),
    `${label}: no template error placeholders`,
  );
  check(html.includes('Skip to content'), `${label}: real layout, not fallback HTML`);
  check((html.match(/<title>/g) ?? []).length === 1, `${label}: one title`);
}

try {
  await cp(starter, fixture, { recursive: true });
  const configPath = join(fixture, 'stati.config.js');
  const config = await readFile(configPath, 'utf8');
  check(config.includes("'@stati/core'"), 'starter uses the public core import');
  // Resolve the caller's installed core without installing dependencies in the fixture.
  await writeFile(configPath, config.replace("'@stati/core'", JSON.stringify(coreUrl.href)));
  await writeFile(join(fixture, 'package.json'), '{"type":"module"}\n');
  process.chdir(fixture);
  setEnv('production');
  clearConfigCache();
  await build({ force: true, logger });

  const out = join(fixture, 'dist');
  const home = await readFile(join(out, 'index.html'), 'utf8');
  const blog = await readFile(join(out, 'blog.html'), 'utf8');
  const post = await readFile(join(out, 'blog', 'hello.html'), 'utf8');
  for (const [label, html] of [
    ['home', home],
    ['blog', blog],
    ['post', post],
  ]) {
    checkHtml(html, label);
  }
  check(home.includes('<h2 id="getting-started">'), 'Markdown HTML and heading anchor');
  check(
    post.includes('id="escaped-text"') && post.includes('id="escaped-text-1"'),
    'duplicate headings have unique IDs',
  );
  check(post.includes('href="#escaped-text-1"'), 'TOC uses extracted anchor');
  check(post.includes('Rendering &lt; &amp; &gt;'), 'current-page title escapes HTML');
  check(blog.includes('Rendering &lt; &amp; &gt;'), 'collection uses frontMatter title');
  check(blog.includes('class="post-card"'), 'hyphenated basename callable component');
  check(blog.includes('READ ARTICLE'), 'nested component has props and custom filter');
  check(!home.includes('class="post-card"'), 'guarded pre-render does not leak cards');
  check(home.includes('href="https://example.com/"'), 'absolute canonical URL');

  const bundleMatch = home.match(/<script[^>]*src="(\/_assets\/main-[^"]+\.js)"[^>]*>/);
  check(bundleMatch, 'hashed browser bundle is auto-injected');
  check(
    (home.match(/src="\/_assets\/main-/g) ?? []).length === 1,
    'browser bundle is not duplicated',
  );
  const bundle = await readFile(join(out, ...bundleMatch[1].slice(1).split('/')), 'utf8');
  check(bundle.includes('enhanced'), 'injected bundle file exists and contains browser code');
  check(
    (await readFile(join(out, 'styles.css'), 'utf8')).includes('.post-card'),
    'public stylesheet copied',
  );

  const searchMatch = home.match(/name="stati:search-index" content="([^"]+)"/);
  check(searchMatch, 'search-index meta tag is injected');
  const search = JSON.parse(
    await readFile(join(out, ...searchMatch[1].slice(1).split('/')), 'utf8'),
  );
  check(Array.isArray(search.documents), 'search is an object with a documents array');
  check(search.documentCount === search.documents.length, 'search count matches documents');
  check(
    search.documents.some((doc) => doc.url === '/blog/hello'),
    'post is searchable',
  );
  check(!search.documents.some((doc) => doc.url === '/draft'), 'draft is not searchable');
  await assert.rejects(readFile(join(out, 'draft.html')), { code: 'ENOENT' });
  assertions += 1;

  const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf8');
  check(
    sitemap.includes('<loc>https://example.com/blog/hello</loc>'),
    'production sitemap contains absolute post URL',
  );
  check(!sitemap.includes('/draft'), 'sitemap excludes normal-build draft');
  check(
    (await readFile(join(out, 'robots.txt'), 'utf8')).includes(
      'Sitemap: https://example.com/sitemap.xml',
    ),
    'explicit robots sitemap',
  );
  const rss = await readFile(join(out, 'rss.xml'), 'utf8');
  check(rss.includes('https://example.com/blog/hello'), 'RSS includes post URL');
  check((rss.match(/<item>/g) ?? []).length === 1, 'RSS filter excludes collection index');

  const cached = await build({ logger });
  check(
    cached.cacheHits > 0 && cached.cacheMisses === 0,
    `second build reuses every cached page (hits ${cached.cacheHits}, misses ${cached.cacheMisses}; ` +
      '@stati/core 1.24.3-1.29.0 re-render every page when search uses a hashed index name)',
  );
  check(
    (await readFile(join(out, 'blog.html'), 'utf8')) === blog,
    'cached HTML preserves component output',
  );

  const site = join(fixture, 'site');
  const layout = await readFile(join(site, 'layout.eta'), 'utf8');
  const optionalPartial =
    "<% if ('missing' in stati.partials) { %><%~ stati.partials.missing %><% } %>";
  const emptyProps = "<%~ stati.partials['post-card']({}) %>";
  await writeFile(
    join(site, 'layout.eta'),
    layout.replace('<body>', `<body>${optionalPartial}${emptyProps}`),
  );
  await writeFile(join(site, 'special.eta'), layout.replace('<body>', '<body><p>NAMED LAYOUT</p>'));
  await writeFile(
    join(site, 'named.md'),
    '---\ntitle: Named layout\nlayout: special\n---\nA named layout page.\n',
  );
  await writeFile(
    join(site, 'custom.md'),
    '---\ntitle: Custom route\npermalink: /custom/\n---\nA custom route page.\n',
  );
  await writeFile(
    join(site, 'blog', 'layout.eta'),
    layout.replace('<body>', '<body><p>SECTION LAYOUT</p>'),
  );
  await writeFile(
    join(site, 'blog', 'index.eta'),
    layout.replace('<body>', '<body><p>INDEX LAYOUT</p>'),
  );
  await mkdir(join(site, 'blog', '_partials'));
  await writeFile(
    join(site, 'blog', '_partials', 'header.eta'),
    '<header>SCOPED HEADER: <%= stati.page.title %></header>',
  );
  await build({ force: true, logger });

  const scopedPost = await readFile(join(out, 'blog', 'hello.html'), 'utf8');
  const scopedBlog = await readFile(join(out, 'blog.html'), 'utf8');
  const updatedHome = await readFile(join(out, 'index.html'), 'utf8');
  const named = await readFile(join(out, 'named.html'), 'utf8');
  const custom = await readFile(join(out, 'custom', 'index.html'), 'utf8');
  for (const [label, html] of [
    ['scoped post', scopedPost],
    ['scoped index', scopedBlog],
    ['updated home', updatedHome],
    ['named layout', named],
    ['custom route', custom],
  ]) {
    checkHtml(html, label);
  }
  check(
    scopedPost.includes('SECTION LAYOUT') && !scopedPost.includes('INDEX LAYOUT'),
    'ordinary post selects section layout, not aggregation layout',
  );
  check(
    scopedBlog.includes('INDEX LAYOUT') && !scopedBlog.includes('SECTION LAYOUT'),
    'aggregation selects nearer index layout before layout',
  );
  check(
    scopedPost.includes('SCOPED HEADER') && scopedBlog.includes('SCOPED HEADER'),
    'page-scoped partial overrides root partial',
  );
  check(!updatedHome.includes('SCOPED HEADER'), 'root page cannot see child-scoped partial');
  check(!updatedHome.includes('class="post-card"'), 'empty props reuse guarded pre-render');
  check(named.includes('NAMED LAYOUT'), 'explicit source-root layout name resolves');
  check(custom.includes('A custom route page.'), 'trailing-slash permalink emits index.html');
  check(diagnostics.length === 0, `no warnings/errors: ${JSON.stringify(diagnostics)}`);
  console.log(`Stati skill smoke test passed (${assertions} assertions).`);
} finally {
  process.chdir(originalCwd);
  setEnv(originalEnv);
  clearConfigCache();
  // mkdtemp created this exact fixture; never remove the caller's site or output.
  assert.equal(dirname(fixture), tmpdir());
  await rm(fixture, { recursive: true, force: true });
}
