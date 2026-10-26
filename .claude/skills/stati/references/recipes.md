# Verified recipes and starter

Read the Eta reference before adapting these patterns. These are Stati patterns,
not generic Eta/EJS, Astro, or Eleventy examples.

## Use the complete starter

The bundled `assets/starter/` contains:

- An ESM package manifest with core/CLI dependencies and standard site scripts.
- A `defineConfig` configuration with a synchronous helper, client TypeScript,
  search, sitemap, robots, and a filtered RSS feed.
- A complete layout with a skip link, navigation, Markdown output, collection
  cards, and extracted TOC links.
- A hyphenated-name card component included with props, which includes a
  sibling template by relative path and calls a helper.
- Home, blog landing, article, and unpublished draft Markdown fixtures.
- Plain CSS and a minimal browser TypeScript entry.

Copy the **contents** into a new, empty site directory only. Do not copy over an
existing site. Change name, domain, content, metadata, and remove unwanted optional
features. Then install using the chosen package manager, build, and preview.
This is a teaching starter, not a full application design or styling installer.
For Sass/Tailwind, scaffold with `create-stati` and adapt the patterns rather than
reusing the plain-CSS build script.

The starter uses esbuild's client TS compilation, but does not ship a TypeScript
typecheck script or a lockfile. Add the project's appropriate TS tooling if
needed, or use the scaffolder's `--typescript` option. Generate/commit a lockfile
in the actual site according to its conventions.

## Run the portable contract smoke test

From a project with `@stati/core` installed:

```sh
node .claude/skills/stati/scripts/smoke-test.mjs
```

Use the equivalent local path if this bundle is installed elsewhere.
The script resolves core from the **current project**, not from a global install.
It creates a uniquely named OS temporary fixture, maps the public core import to
that installed entry, builds production HTML, inspects artifacts, runs a second
cached build, and removes only that fixture. It does not install packages, alter
the user's config, clean their output, launch servers, or upload data.
Failures are assertions/errors and exit nonzero; diagnostic warnings are failures.

It checks:

- A real full-document layout, escaped titles, raw Markdown.
- Includes with props, hyphenated template paths, a nested relative include, and
  an explicitly registered helper.
- Explicit/section/index layout precedence, a shell named with `stati.layout()`
  that receives props and `stati.body`, a section override at the same template
  path, an optional include behind `stati.include.has()`, and an include with
  props and children.
- Collection item access via `frontMatter`.
- TOC IDs, including duplicate heading IDs.
- A copied stylesheet and an existing hashed auto-injected browser bundle.
- Search index object shape, correct document count, and draft exclusion.
- Production sitemap, explicit robots sitemap link, and filtered RSS item count.
- Cache hits and unchanged cached component output.
- Explicit trailing-slash permalink output as a directory index.

This verifies the bundled teaching example on the installed version; it is not
a substitute for browser testing, deployment checks, or the user's site tests.

## Blog index with a dedicated layout

Author `site/blog/index.md` and posts in that directory. Put the complete
aggregation document in `site/blog/index.eta`; use `layout.eta` for ordinary
posts. Empty sections may not qualify as aggregation pages.

In the listing:

```eta
<section aria-label="Latest posts">
  <% const posts = stati.collection?.recentPages ?? []; %>
  <% if (posts.length === 0) { %>
    <p>No articles have been published yet.</p>
  <% } else { %>
    <% for (const post of posts) { %>
      <%~ stati.include('partials/card', {
        title: post.frontMatter.title ?? 'Untitled',
        description: post.frontMatter.description,
        url: post.url
      }) %>
    <% } %>
  <% } %>
</section>
```

Create `site/partials/card.eta`; it reads `stati.props`. Quote publication dates for
reliable parsed-date sorting. Do not link tags to nonexistent archive pages.

## Component with optional props

```eta
<article class="<%= stati.propValue('author', stati.props?.featured && 'featured') %>">
  <h2><%= stati.props?.name ?? stati.page.author ?? stati.site.authorName ?? 'Author' %></h2>
</article>
```

This template renders with or without props, because `stati.props` is
`undefined` when an include passes none. A template that always gets props can
read `stati.props.name` directly: templates render only where they are included.
Validate required props explicitly rather than accidentally rendering malformed
URLs or `"undefined"` text.

## Optional template

For a file `site/partials/post-meta.eta`, which a section may or may not have:

```eta
<% if (stati.include.has('partials/post-meta')) { %>
  <%~ stati.include('partials/post-meta') %>
<% } %>
```

Names are paths without `.eta`, not camel-cased basenames. Do not wrap an include
in `try` or test truthiness through the development proxy.

## Synchronous formatting helper

Config:

```ts
helpers: {
  formatDate: (value: string) =>
    new Date(value).toLocaleDateString('en', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
}
```

Template:

```eta
<% if (stati.page.publishedAt) { %>
  <time datetime="<%= stati.page.publishedAt %>">
    <%= stati.helpers.formatDate(stati.page.publishedAt) %>
  </time>
<% } %>
```

Validate ISO date strings before this helper if content is not trusted/controlled.
Formatting functions are not built in until registered; choose timezone/locale
intentionally to keep builds reproducible.

## Manual browser bundle placement

Set `typescript.autoInject: false` only when manual placement is needed:

```eta
<% for (const path of stati.assets?.bundlePaths ?? []) { %>
  <script type="module" src="<%= path %>"></script>
<% } %>
```

Use returned paths, never guessed hashes. This is not component hydration.

## Search-index loading in browser TypeScript

```ts
async function loadSearchIndex(): Promise<unknown> {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="stati:search-index"]');
  if (!meta?.content) {
    throw new Error('The search index metadata is missing.');
  }
  const response = await fetch(meta.content);
  if (!response.ok) {
    throw new Error(`Search index request failed (${response.status}).`);
  }
  return response.json();
}
```

This loader intentionally returns `unknown`: validate `documents` and document
fields before searching/rendering them. The calling UI must visibly handle load
errors; do not catch and return an empty list that disguises a failed request as
"no matches." Render text using DOM text APIs, and build result links from the
verified URL plus nonempty anchor, with the index's `basePath` (`""` or a string such as
`/sub`) in front of the URL.

## Data-driven content

Fetch/transform external content in a preparatory script before `stati build` if
it creates new source files. `beforeAll` sees already discovered pages. Use
`beforeRender` for metadata enrichment of cache-miss pages, not an every-page
fetch guarantee. Decide how remote-data freshness forces builds, how failures
are surfaced, and which fields become public. Never embed credentials in the
generated browser bundle or copy them to `public/`.
