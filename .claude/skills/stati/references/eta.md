# Eta, layouts, partials, and components

## Engine contract

Stati creates Eta with `views` set to the resolved content source directory and
`varName: 'stati'`. Delimiters are `<%` and `%>`, extension `.eta`. Config exposes
`eta.filters`, not arbitrary Eta options. Current source caches compiled templates
in development as well as production and clears the engine cache on template
changes; older docs describing development caching as disabled are stale.

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
filters or build tooling, not into templates. Browser DOM APIs belong in browser
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
component result may be passed to a wrapper's `content` prop and emitted raw;
do not do that with user input. HTML escaping does not make `javascript:` URLs
safe: validate externally supplied destinations separately.

## Runtime context: know which object you have

| Expression                            | Runtime meaning                                                  |
| ------------------------------------- | ---------------------------------------------------------------- |
| `stati.site`                          | Configured site object, including explicitly added custom fields |
| `stati.page`                          | Current page's frontmatter merged with reserved runtime fields   |
| `stati.page.path`, `stati.page.url`   | Public page URL, **not source filename**                         |
| `stati.page.content`, `stati.content` | Rendered Markdown HTML                                           |
| `stati.page.toc`                      | `{ id, text, level }[]`; empty if unavailable                    |
| `stati.page.navNode`                  | Current node, possibly undefined                                 |
| `stati.nav`                           | Navigation helper object, not a bare array                       |
| `stati.collection`                    | Optional aggregation object; see below                           |
| `stati.partials`                      | Exact-name callable partials                                     |
| `stati.props`                         | Only supplied on a nonempty-props component render               |
| `stati.generator.version`             | Core package version                                             |
| `stati.assets`                        | Optional asset object with `bundlePaths`, `searchIndexPath`      |
| `stati.propValue(...)`                | Token-list attribute helper                                      |
| `stati.generateSEO(tags?)`            | Generated SEO HTML; use raw output when needed                   |
| `stati.someFilter(...)`               | A function you registered in `eta.filters`                       |

Frontmatter keys `path`, `url`, `content`, `navNode`, `toc` conflict with runtime
fields: Stati warns and overwrites them. Filters are spread into the base context;
avoid names such as `site`, `page`, `content`, `nav`, `collection`, `partials`,
`props`, `generator`, `generateSEO`, `propValue`, and `assets`.

The public `TemplateContext` type is not the complete runtime shape (notably
`partials` is typed as strings in the checked version). Do not infer that
callable partials are unsupported, or that any arbitrary context property exists.

## Layout selection

For a page, the runtime:

1. Checks frontmatter `layout`, as `srcDir/<layout>.eta`.
2. Walks the **source page's directory**, nearest first, back to the source root.
3. At each directory, checks `index.eta` first **if this page is an aggregation
   page**, then `layout.eta`.
4. Uses fallback HTML if no layout exists.

An explicit layout that does not exist currently falls through to automatic
discovery; it is not a reliable typo detector. Check it yourself. Do not append
`.eta` in frontmatter (`article.eta` would be looked up as `article.eta.eta`).
`layout: blog/article` refers to a source-root-relative template. Do not use
directory traversal.

The root URL is always considered an aggregation page when all pages are supplied.
A nonroot page is considered one when another page URL is its descendant; this is
not strictly limited to filenames `index.md`. An empty section's `index.md` may
therefore use `layout.eta`, not `index.eta`. A nearer `layout.eta` wins over a
farther ancestor's `index.eta`; Stati does not scan all index layouts first.

Section layouts completely replace ancestor layouts. Keep each selected layout a
complete HTML document, sharing head/header/footer partials where useful.
An `.eta` file by itself is not emitted as a page: it needs a Markdown page.

## Discovery and naming

```text
site/
  layout.eta
  _partials/
    header.eta
    footer.eta
    ui/
      card.eta
  blog/
    layout.eta
    _components/
      card.eta
      post-meta.eta
    index.md
    entry.md
```

- At each level of the **page's** source ancestry, Stati scans immediate `_*/`
  directories and recursively discovers their `.eta` files.
- `card.eta` under `_partials/ui/` is `stati.partials.card`, not
  `stati.partials.ui.card` or `stati.partials['ui/card']`.
- `post-meta.eta` is `stati.partials['post-meta']`, not `postMeta`.
- Deeper source-directory definitions override ancestors with the same basename.
  Duplicate basenames within one level have no author-facing priority contract:
  avoid them even if in differently named underscore folders.
- No sibling/child-source-directory discovery. Put globally shared components in
  a root underscore directory. `_components`, `_partials`, `_sections`, `_scripts`,
  and other underscore names are conventions, not different runtime APIs.
- Visibility depends on the page, **not the selected layout's physical directory**.
  A root layout rendering a blog page can see that page's discovered blog partials.
- Do not confuse a source `srcDir` directory with the client TypeScript `src/`.

**Windows caveat in the checked source:** partial ancestry splits a directory
string on `/` only, unlike layout discovery. For nested source paths using native
backslashes, an intermediate ancestor may be skipped. Do not rely on intermediate
partial overrides without an actual Windows build test. Global root components
are the most portable shared location. Recheck this caveat after upgrading.

## Component lifecycle and props

Stati pre-renders **every discovered partial** for each page, even if the layout
never uses it. Pre-rendering receives no `stati.props`; dependencies are retried
in at most three passes. Then rendered results are wrapped as callable partials.

```eta
<%~ stati.partials.header %>
<%~ stati.partials.header() %>
<%~ stati.partials.header({}) %>
<%~ stati.partials.card({ title: 'A post', url: '/blog/a-post' }) %>
```

The first three return the pre-rendered result. Only a **nonempty** props object
re-renders with `{ ...baseContext, props }`. Props do not replace `stati.page` or
become bare `title`, `url`, or `it.title` variables.

Two safe partial strategies:

**Content partial usable without props:**

```eta
<header>
  <a href="/"><%= stati.props?.title ?? stati.site.title %></a>
</header>
```

**Component-only partial:**

```eta
<% if (!stati.props) { return; } %>
<article class="<%= stati.propValue('card', stati.props.featured && 'featured') %>">
  <h2><%= stati.props.title ?? 'Untitled' %></h2>
  <% if (stati.props.url) { %>
    <a href="<%= stati.props.url %>">Read more</a>
  <% } %>
</article>
```

Using `stati.props.title || 'Untitled'` without guarding `stati.props` throws
during pre-rendering, even if every intended caller supplies props.

### Nested components and trusted slots

Nested callable partials can call other callable partials using the full base
context, but each nested call needs its own props:

```eta
<% if (!stati.props) { return; } %>
<button type="button">
  <%~ stati.partials.icon({ name: stati.props.icon ?? 'check' }) %>
  <%= stati.props.label %>
</button>
```

Do not assume parent locals or parent props are inherited by the child. For a
wrapper, explicitly supply a trusted HTML result:

```eta
<%~ stati.partials.panel({
  content: stati.partials.card({ title: 'Inside a panel' })
}) %>
```

This is an explicit prop pattern, not a built-in slot API. Avoid cyclic component
calls. Three pre-render passes are not a guarantee of arbitrary ordering or
arbitrary-depth no-props composition. Keep helpers pure: they may execute several
times per page. Do expensive/remote work in build preparation, not components.
Callable rendering is synchronous (`eta.render`); do not design components around
`await`, async filters, or async-only includes.

### Optional and missing partials

Use membership:

```eta
<% if ('sidebar' in stati.partials) { %>
  <%~ stati.partials.sidebar %>
<% } %>
```

A truthiness test (`if (stati.partials.sidebar)`) can be misleading: outside
explicit production mode, a missing-name read on a nonempty partial registry
returns an inline error-overlay value/function, which is truthy. In production a
missing partial can be undefined or a failed call. Required partials should exist,
not be hidden by optional checks.

Check both logs and output. Layout failures can produce fallback documents;
failed pre-renders can produce `<!-- Error rendering partial: ... -->`;
callable failures log to the console and return an error comment even when the
overall build completes. Treat all of these as validation failures.

## Native Eta includes: advanced, not the Stati component API

Eta's `include(template, data)` / `includeAsync(template, data)` operate on
file-based templates and explicitly passed data. They do not invoke Stati's
basename discovery, pre-rendered wrappers, or automatic props merging.

Prefer `stati.partials` for site components. If integrating a native include,
inspect the installed Eta version, its relative-path resolution, and the data
argument. Pass the desired context explicitly; do not assume `include('card',
{ title })` supplies `stati.site` or `stati.props`. Verify incremental dependency
invalidation too; a working render is not proof that custom include relationships
are tracked correctly.

## Collections inside templates

An aggregation object has `pages`, `children`, `recentPages`, `pagesByTag`,
and `metadata` (`totalPages`, `hasChildren`, `collectionPath`, `collectionName`).
All arrays contain **PageModel**, not flattened frontmatter:

```eta
<% for (const post of stati.collection?.recentPages ?? []) { %>
  <%~ stati.partials.card({
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
Neither links nor tags generate additional content routes.

**Checked-version caveat:** child-page parent collection lookup constructs a
trailing-slash parent URL, but normalized section index URLs commonly lack that
slash. Despite broad type/docs claims, `stati.collection` may be undefined on
ordinary child pages. Guard it; use navigation helpers or explicit data for
related-content UI rather than depending on a parent collection.

Authority: `packages/core/src/core/templates.ts`,
`core/utils/template-discovery.utils.ts`, `callable-partials.utils.ts`,
`partial-validation.utils.ts`, `template.utils.ts`, `types/content.ts`;
`packages/core/test/core/templates.test.ts`, `collection-aggregation.test.ts`,
and `test/utils/callable-partials.test.ts`. Paths are relative to the Stati source
checkout, not guaranteed to exist in a generated site.
