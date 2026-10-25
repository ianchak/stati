# Eta, layouts, includes, and components

## Engine contract

Stati creates Eta 4 with `views` set to the resolved content source directory and
`varName: 'stati'`. Delimiters are `<%` and `%>`, extension `.eta`. Config exposes
a top-level `helpers` object, not arbitrary Eta options; an `eta` key fails config
validation as an unknown option. Compiled templates are cached in development as
well as production, and the engine cache is cleared on template changes.

| Syntax                                        | Meaning                    |
| --------------------------------------------- | -------------------------- |
| `<% const title = stati.page.title; %>`       | Run JavaScript             |
| `<%= title %>`                                | HTML-escaped interpolation |
| `<%~ stati.content %>`                        | Raw rendered Markdown HTML |
| `<% if (condition) { %>...<% } %>`            | Conditional output         |
| `<% for (const item of items) { %>...<% } %>` | Repeated output            |
| `<% /* explanation */ %>`                     | JavaScript comment         |

There is no TypeScript transpilation of template code. Do not copy documentation
snippets containing `as string`, type annotations, or interfaces into `.eta`.
Template locals are not a module-import surface. Import libraries into config
helpers or build tooling, not into templates. Browser DOM APIs belong in browser
scripts, not server-side rendering.

## Full dynamic HTML attributes

Follow Stati's fully dynamic attribute convention even though generic Eta can
render some mixed static/dynamic strings:

```eta
<% const variant = stati.page.variant || 'default'; %>
<article
  class="<%= stati.propValue('card', `card-${variant}`, {
    'is-featured': stati.page.featured
  }) %>"
  data-id="<%= `page-${stati.page.url}` %>"
>
  <h1><%= stati.page.title %></h1>
</article>
```

Do not write `class="card-<%= variant %>"`, `href="#<%= id %>"`, or
`href="/tags/<%= tag %>/"`. Use a template literal for the entire concatenated
value. `propValue` is for space-separated tokens, not path concatenation.

Actual `propValue` behavior:

- Strings and nonzero numbers become tokens; falsy arguments are omitted.
- Object **keys** are emitted when their values are truthy.
- Arrays are filtered to truthy strings/numbers. Despite the recursive-looking
  type, nested arrays/objects inside arrays are not recursively flattened.
- Standalone booleans do not emit text; zero is omitted; tokens are not deduplicated.
- It records emitted tokens for Tailwind inventory. This is not a CSS processor
  and does not make arbitrary dynamic classes valid Tailwind utilities.

Escape text by default. Raw output is for trusted rendered HTML only. A trusted
include result may be passed as another include's `body` and printed raw as
`stati.body`; do not do that with user input. HTML escaping does not make
`javascript:` URLs safe: validate externally supplied destinations separately.

## Runtime context: know which object you have

| Expression                            | Runtime meaning                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `stati.site`                          | Configured site object, including explicitly added custom fields               |
| `stati.page`                          | Current page's frontmatter merged with reserved runtime fields                 |
| `stati.page.path`, `stati.page.url`   | Public page URL, **not source filename**                                       |
| `stati.page.content`, `stati.content` | Rendered Markdown HTML                                                         |
| `stati.page.toc`                      | `{ id, text, level }[]`; empty if unavailable                                  |
| `stati.page.navNode`                  | Current node, possibly undefined                                               |
| `stati.page.readingTime`              | Whole minutes to read, at least 1; `stati.page.wordCount` is the word count    |
| `stati.nav`                           | Navigation helper object, not a bare array                                     |
| `stati.collection`                    | Optional aggregation object; see below                                         |
| `stati.pagination`                    | Page of a `paginate` listing (1.29+), else undefined                           |
| `stati.generated`                     | Key, label, items of a `[param].md` page (1.29+), else undefined               |
| `stati.slugify(text)`                 | Stati's slug for generated page keys (1.29+)                                   |
| `stati.url(path)`                     | Site path with the base path of `site.baseUrl` added (2.5+)                    |
| `stati.include(name, props?, body?)`  | Renders another template here and returns its HTML (2.0+)                      |
| `stati.layout(name, props?)`          | Wraps this template's output in another template; returns `''` (2.0+)          |
| `stati.include.has(name)`             | Whether a name resolves for this page; same as `stati.layout.has`              |
| `stati.body`                          | HTML this template wraps; absent in the page's layout and `og.eta`             |
| `stati.props`                         | Props of the include/layout call that rendered it, else undefined              |
| `stati.helpers`                       | Functions from the config's `helpers` (2.0+)                                   |
| `stati.generator.version`             | Core package version                                                           |
| `stati.assets`                        | Optional asset object with `bundlePaths`, `searchIndexPath`, `stylesheetPaths` |
| `stati.propValue(...)`                | Token-list attribute helper                                                    |
| `stati.generateSEO(tags?)`            | Generated SEO HTML; use raw output when needed                                 |
| `stati.image(src, options?)`          | Sized `<img>` (or `<picture>`) HTML, synchronous; print with `<%~ %>`          |
| `stati.ogImage`                       | Generated Open Graph image `{ url, path, width, height, alt }`, or undefined   |
| `stati.og`                            | `{ width, height }` inside an `og.eta` card template; undefined elsewhere      |

Frontmatter keys `path`, `url`, `content`, `navNode`, `toc` conflict with runtime
fields: Stati warns and overwrites them. The root of `stati` holds only Stati's
API: helpers live under `stati.helpers`, so a helper named `page`, `image` or
`slugify` never shadows Stati's value. Inside a helper written with `function` or
method syntax, `this` is the helpers object (its validating proxy in development),
not the template context; pass what a helper needs as arguments.

`stati.image(src, { alt, sizes, priority, class, title })` resolves `src` like a
Markdown image: from `public/` when it starts with `/`, otherwise next to the page's
Markdown file. It returns `''` for an empty `src`, so `stati.image(stati.page.cover)`
needs no guard, and warns when `alt` is missing (pass `alt: ''` for decorative
images). `priority: true` loads the image eagerly with high fetch priority.

`stati.url(path)` adds the path of `site.baseUrl` (`https://example.com/docs` gives
`/docs`) to a path from the site root: `stati.url('/posts/hello')` is
`/docs/posts/hello`, `stati.url('/')` is `/docs/`. Absolute (`https:`, `mailto:`),
`//` and `#hash` or `?query` values, relative paths and paths already starting with
the base path come back unchanged, so a second call is harmless, and without a base
path every value comes back unchanged. `page.url`, navigation and collection
`url`s, pagination URLs, front matter and `stati.assets.*` paths stay relative to
the site root: wrap them when printing a link. Stati adds the prefix itself to
bundle scripts, the stylesheet links, the search index meta tag, `stati.image()`
and Markdown image URLs, and root-absolute Markdown links; raw HTML in Markdown is
left as written. Build warnings name an `href` or `src` starting with `/` that
lacks the prefix.

The public `TemplateContext` type covers the runtime shape, including `include`,
`layout`, `body`, `props` and `helpers`; `page.toc` is the one runtime field it
leaves out. Do not infer that any other context property exists.

### Unknown-property check in development

The dev server wraps the context in a validating proxy. Reading a `stati.*`
property that does not exist throws, and the error overlay shows the template
file, line, and a "Did you mean" suggestion (`stati.paeg` → `stati.page`,
`stati.title` → `stati.page.title`, `stati.formatDate` and
`stati.helpers.formatDat` → `stati.helpers.formatDate`). It checks top-level keys
and the keys of `site`, `nav`, `collection`, `generator` and `helpers`. Unset
optional `SiteConfig` fields (`description`, `defaultLocale`) are allowed. Reading
`stati.body` where it is absent throws with a hint pointing at `stati.content`.
It does **not** check frontmatter under `stati.page`, code that doesn't run on the
current page, or production builds.

Consequences for template code:

- Test for an optional helper with `'name' in stati.helpers`, and for an optional
  template with `stati.include.has(name)`. A read such as
  `typeof stati.helpers.myHelper` or `stati.helpers.myHelper ?? fallback` throws in
  dev when the key is absent.
- `stati.props` is always present (undefined without props), so
  `stati.props?.title` is safe. The same holds for `stati.og` and `stati.ogImage`.
- A typo fails the dev build instead of printing `undefined`. Production is
  unchanged: the same typo still renders `undefined` or falls back to the
  fallback layout, so fix what the dev overlay reports before shipping.

## Layout selection

For a page, the runtime:

1. Resolves frontmatter `layout` with the template lookup below: `layout: article`
   is the nearest `article.eta` from the page's folder up, `layout: /article` is
   `srcDir/article.eta` only.
2. Otherwise walks the **source page's directory**, nearest first, back to the
   source root.
3. At each directory, checks `index.eta` first **if this page is an aggregation
   page**, then `layout.eta`.
4. Uses fallback HTML if no layout exists.

A frontmatter `layout` that names no template logs a warning with similar names
and falls through to step 2. A `.eta` suffix is accepted and dropped. Names never
resolve outside the source directory. The lookup matters when a section has a
template with the same name: on a page in `site/posts/` with its own `layout.eta`,
`layout: layout` finds `site/posts/layout.eta`; write `layout: /layout` for the
root one.

The root URL is always considered an aggregation page when all pages are supplied.
A nonroot page is considered one when another page URL is its descendant; this is
not strictly limited to filenames `index.md`. An empty section's `index.md` may
therefore use `layout.eta`, not `index.eta`. A nearer `layout.eta` wins over a
farther ancestor's `index.eta`; Stati does not scan all index layouts first.

A section's `layout.eta` replaces ancestor layouts for its pages. Share the
document around them with a shell named by `stati.layout()` (below) rather than
repeating the `<head>`, header and footer in every layout. An `.eta` file by
itself is never emitted as a page: it needs a Markdown page.

## Template names and lookup

```text
site/
  base.eta
  layout.eta
  partials/
    header.eta
    ui/
      card.eta
  blog/
    layout.eta
    partials/
      header.eta
    index.md
    entry.md
```

- Any `.eta` file under the source directory can be included or named as a layout.
  Underscore folders are not required; content discovery still skips `_` folders,
  so `_` means "no pages here", not "templates here".
- Names are paths without `.eta`, not basenames: `card.eta` under `partials/ui/`
  is `stati.include('partials/ui/card')`. `post-meta.eta` stays `post-meta`.
- A plain name (`header`, `partials/header`) is looked up from the **page's**
  folder up to the source root; the nearest match wins. `blog/partials/header.eta`
  therefore overrides `partials/header.eta` for blog pages, even when the include
  sits in the root `base.eta`: lookup follows the page, not the calling template.
- `/partials/header` is read from the source root only. `./icon` and
  `../icons/arrow` are relative to the calling template's folder.
- Backslashes are normalized to `/`. Empty names, names ending in `/`, drive
  letters, and names escaping the source directory are errors. The built-in Open
  Graph template has no file, so relative names fail inside it.
- One `**/*.eta` index is built per build (a dev session keeps and updates it), so
  lookups do not glob per page and behave the same on Windows.
- Do not confuse a source `srcDir` directory with the client TypeScript `src/`.

## Includes, props, and content

`stati.include(name, props?, body?)` renders the template synchronously with
`eta.render` in its own context (`{ ...page values, props, body, include, layout }`)
and returns its HTML:

```eta
<%~ stati.include('partials/header') %>
<%~ stati.include('partials/card', { title: 'A post', url: '/blog/a-post' }) %>
<%~ stati.include('partials/panel', { tone: 'note' }, stati.include('partials/card', { title: 'Inside a panel' })) %>
```

- A template renders only where it is included; there is no pre-render pass, so
  component templates need no `if (!stati.props) { return; }` guard. Keep checks
  only for props a template really treats as optional.
- Props arrive as `stati.props`, never as bare `title` or `it.title` variables, and
  do not replace `stati.page`. A nested include receives only the props it is
  given; parent props and locals are not inherited.
- The third argument is printed by the template as `stati.body` (raw). This is the
  children mechanism for wrappers; there is no named-slot API. Pass extra regions
  as props.
- Without props and body, the first render of a template on a page is cached and
  reused by later includes on that page. The cache is keyed by file **and** base
  context, so the Open Graph template's renders never leak into the layout's.
- Props must be an object and `body` a string: anything else is a dev error and a
  production warning, and the value is dropped.
- A template that includes itself without props, directly or through others, is a
  cycle: dev error naming the chain, production error with the repeat skipped.
  With props, recursion (trees) is allowed up to a depth of 100.
- `await` in an included template is an error with a hint that includes render
  synchronously. Layouts and shells render asynchronously and may await.
- An unknown name is a dev overlay listing similar paths; production logs an error
  and the include returns `''`. A runtime error inside an included template opens
  the overlay at that file in dev; production logs it and emits
  `<!-- Error rendering site/...: message -->` in its place.

Use `stati.include.has(name)` for optional templates:

```eta
<% if (stati.include.has('partials/sidebar')) { %>
  <%~ stati.include('partials/sidebar') %>
<% } %>
```

Check both logs and output. Layout failures produce fallback documents and include
failures produce `<!-- Error rendering ... -->` comments even when the overall
build completes. Treat both as validation failures. A page that logged an error is
never served from the ISG cache (unknown include names count): each build renders it
again and logs the error again until it is fixed.

## Shells: `stati.layout()`

```eta
<!-- site/base.eta -->
<!DOCTYPE html>
<html lang="<%= stati.site.defaultLocale || 'en' %>">
  <%~ stati.include('partials/head') %>
  <body class="<%= stati.propValue(stati.props?.bodyClass) %>">
    <%~ stati.include('partials/header') %>
    <%~ stati.body %>
    <%~ stati.include('partials/footer') %>
  </body>
</html>
```

```eta
<!-- site/blog/layout.eta -->
<% stati.layout('base', { bodyClass: 'post' }) %>
<main id="main"><%~ stati.content %></main>
```

- `stati.layout(name, props?)` can be called anywhere in a template; the wrapping
  happens after the template finishes. It returns `''`.
- The named template prints the output as `stati.body` and reads props as
  `stati.props`; it can name its own parent, so shells nest.
- Each render has its own layout slot: a component calling `stati.layout()` wraps
  only itself, never the page.
- One call per template: a second call is a dev error and a production warning
  (last call wins). A call after the template finished rendering is a dev error
  and is ignored in production. An unknown name is a dev error; production logs it
  and renders the template unwrapped.
- Discovery only picks `layout.eta`/`index.eta`, so a shell such as `base.eta` is
  never a page's layout by accident.
- `<body class="">` differs from `<body>`: when a starter must keep a bare tag,
  branch on `stati.props?.bodyClass` instead of always printing the attribute.

## Eta's own include, layout, and block are blocked

Stati's Eta plugin redefines Eta's `include`, `includeAsync`, `layout`, `block`
and `blockAsync` inside every compiled template. A call is a dev error overlay
that names the replacement (`include('x', data)` → `stati.include('./x', data)`;
`layout('x', data)` → `stati.layout('./x', data)` with the data as `stati.props`;
`block()` → pass the content to the layout as a prop) and, in production, a
logged error with `''` rendered and no layout applied. The suggested name keeps
Eta's resolution: a bare name becomes `./name`. Templates may still declare their
own variables named `layout`, `block` or `output`.

## Collections inside templates

An aggregation object has `pages`, `children`, `recentPages`, `pagesByTag`,
and `metadata` (`totalPages`, `hasChildren`, `collectionPath`, `collectionName`).
All arrays contain **PageModel**, not flattened frontmatter:

```eta
<% for (const post of stati.collection?.recentPages ?? []) { %>
  <%~ stati.include('partials/card', {
    title: post.frontMatter.title ?? 'Untitled',
    url: post.url,
    featured: post.frontMatter.featured
  }) %>
<% } %>
```

Nonroot collections include descendant URLs, excluding the current page. Root
collection behavior is direct-root membership, not all site descendants.
`recentPages` sorts parsed `PageModel.publishedAt` (first valid of `publishedAt`,
`published`, `date`, `createdAt`) newest first; undated pages follow,
alphabetically by frontmatter title/URL fallback. `pagesByTag` uses string tags.
Links and tags alone generate no routes; `paginate` and `[param].md` templates do
(see [content](./content.md#collections-pagination-and-generated-pages)).

From core 1.29, ordinary child pages read the collection they belong to
(`/blog/post` reads `/blog`), so prev/next and related posts can come from
`stati.collection.recentPages`; `collection: /blog` in frontmatter names another
one. Before 1.29 a trailing-slash lookup bug left nested child pages with
`undefined`. Always guard it. Each render gets its own array copies, so sorting
in place is safe. Reading `stati.collection`, `stati.nav` or
`stati.page.navNode` is recorded: ISG rebuilds the page when that data changes.
Read `stati.pagination.items` rather than the whole collection on paginated
pages, so a page only rebuilds when its own slice changes.

## Template dependency recording

Each page's cache entry stores the template files it rendered (layout first,
then shells, includes and the Open Graph template) and every name it looked up
with the folder and the file found (`null` on a miss, including `.has()` misses).
A cached page rebuilds when a recorded template changes or disappears, when its
layout would now be a different file, or when a recorded name would now find a
different file, such as a new section override. A conditional include that did not
render on a page is not recorded for it. The dev server rebuilds only affected
pages on template add/change/unlink; editing a template no page renders rebuilds
nothing. Helpers are config code and are not recorded: after changing one, rebuild
with `--force`.

Authority: `packages/core/src/core/templates.ts`, `core/template-render.ts`,
`core/template-index.ts`, `core/eta-plugin.ts`, `core/collections.ts`,
`core/expand.ts`, `core/isg/builder.ts`, `core/utils/template-discovery.utils.ts`,
`core/utils/context-validation.utils.ts`, `template.utils.ts`, `types/content.ts`;
`packages/core/test/core/templates.test.ts`, `template-composition.test.ts`,
`template-index.test.ts`, `template-recording.test.ts`, `eta-plugin.test.ts`,
`dev-template-changes.test.ts`, `collection-aggregation.test.ts`,
`collections.test.ts`, `expand.test.ts` and `*-integration.test.ts`. Paths are
relative to the Stati source checkout, not guaranteed to exist in a generated site.
