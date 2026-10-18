---
title: 'Upgrading to Stati 2'
description: 'Move a Stati 1 site to stati.include(), stati.layout() and stati.helpers.'
order: 5
---

# Upgrading to Stati 2

Stati 2 gives templates one way to combine and one place for your functions. `stati.include()` replaces `stati.partials`, `stati.layout()` lets layouts share one page shell, and the functions you registered under `eta.filters` move to a top-level `helpers` option. Most sites change only their template calls and a few lines of config.

## Update the packages

```bash
npm install @stati/core@^2 @stati/cli@^2
```

Upgrade the two together: each CLI version runs the core of its own major version. `@stati/images` works with Stati 2 as it is.

Then build once with `stati build` and fix the errors it reports, using the sections below. The dev server shows the same problems in its error overlay, with the file and line.

## Replace `stati.partials` with `stati.include()`

`stati.include()` takes the template's path from `site/`, without `.eta`, so a partial's name becomes its path:

| Before                                                            | After                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| `stati.partials.header`                                           | `stati.include('_partials/header')`                  |
| `stati.partials['page-head']({ … })`                              | `stati.include('_partials/page-head', { … })`        |
| `stati.partials.card({ title })` for `_components/cards/card.eta` | `stati.include('_components/cards/card', { title })` |
| `stati.partials[name](props)`                                     | `stati.include(name, props)`, with `name` now a path |
| `'card' in stati.partials`                                        | `stati.include.has('_partials/card')`                |

Paths are looked up from the page's folder up to `site/`, as partials were. A section that overrides a partial keeps working when both files sit at the same path: `site/_partials/header.eta` and `site/blog/_partials/header.eta` are both `stati.include('_partials/header')`, and blog pages get their own. If the override lives in a differently named folder, such as `site/blog/_components/header.eta`, move it so the two paths match.

Templates render only where they are included, so the guards that kept component partials from failing without props can go:

```eta
<% if (!stati.props) { return; } %>  <!-- No longer needed -->
```

Keep a check like this only where the template really treats its props as optional.

## Move filters to `helpers`

Functions registered under `eta.filters` move to the top-level `helpers` option, and templates call them through `stati.helpers`:

```javascript
// Before
export default defineConfig({
  eta: {
    filters: {
      formatDate: (date) => new Date(date).toLocaleDateString('en-US'),
    },
  },
});

// After
export default defineConfig({
  helpers: {
    formatDate: (date) => new Date(date).toLocaleDateString('en-US'),
  },
});
```

| Before                           | After                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| `stati.formatDate(x)`            | `stati.helpers.formatDate(x)`                                               |
| `eta: { filters: site.filters }` | `helpers: site.helpers`, renaming the export in the module that builds them |

Stati's own functions stay where they are: `stati.slugify()`, `stati.propValue()`, `stati.image()` and `stati.generateSEO()`. A filter named `slugify` used to replace `stati.slugify` with your own; as a helper it is `stati.helpers.slugify`, and `stati.slugify` is Stati's again, so call the one you mean.

In a TypeScript config, helpers are typed `(...args: any[]) => unknown`, so their parameters can have real types now.

## Replace Eta's `include()`, `layout()` and `block()`

Eta's own functions are not available in Stati templates:

| Before               | After                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| `include('x', data)` | `stati.include('./x', data)`                                                        |
| `includeAsync('x')`  | `stati.include('./x')` (includes render synchronously)                              |
| `layout('x', data)`  | `stati.layout('./x', data)`, reading `data` as `stati.props`                        |
| `block('name')`      | Pass the content to the layout as a prop: `stati.layout('base', { sidebar: html })` |

Names starting with `./` or `../` are relative to the template making the call, which matches how Eta resolved them.

## Check front matter `layout` values

A `layout` in front matter is now looked up like any other template name: from the page's folder up to `site/`. Most sites see no difference. It matters when a section has a template with the same name as the one the page means: on a page in `site/posts/`, `layout: layout` used to mean `site/layout.eta` and now finds `site/posts/layout.eta` first. Name the root template with a leading `/`, as in `layout: /layout`.

A `layout` value that names no template now produces a warning with similar names, instead of falling back silently.

## Optional: share one page shell

If your site has several complete layouts that repeat the same `<head>`, header and footer, move that document into one template and let each layout name it with `stati.layout()`:

```eta
<!-- site/base.eta -->
<!DOCTYPE html>
<html lang="en">
  <%~ stati.include('_partials/head') %>
  <body>
    <%~ stati.include('_partials/header') %>
    <%~ stati.body %>
    <%~ stati.include('_partials/footer') %>
  </body>
</html>
```

```eta
<!-- site/blog/layout.eta -->
<% stati.layout('base') %>
<main class="post"><%~ stati.content %></main>
```

See [Sharing a shell](/core-concepts/templates#sharing-a-shell).

## Optional: move templates out of `_` folders

Templates no longer need underscore folders: any `.eta` file under `site/` can be included, and only Markdown files become pages. The starters keep theirs in `site/partials/`. Content discovery still skips `_` folders, so keep using them for drafts or data you don't want published. If Tailwind scans your templates, make sure its `content` globs cover the folders you move them to.

## Other changes

- **Unused templates don't render.** Stati 1 rendered every partial for every page; now a page renders only its layout, the shells it names and what it includes. Errors and warnings from partials a page never used go away.
- **Includes render synchronously.** An included template can't use `await`; move the work into a `beforeAll` hook, or into the layout, which still renders asynchronously.
- **A missing include doesn't fail the page.** In a production build, an unknown name logs an error and renders nothing, instead of writing the page with the fallback HTML.
- **Every page rebuilds once.** The ISG cache now records the templates each page rendered, so the first build after upgrading renders every page.
- **`this` in a helper** is the helpers object, not the template context.
- **Build metrics** count templates differently: `templatesLoaded` is the number of distinct templates each rendered page used, and `templateRenders`, `includeCacheHits` and `templatesIndexed` are new. See [Build metrics](/advanced/metrics#templates-loaded-and-renders).
- **Eta 4.** Stati now uses Eta 4. Templates need no changes for it.
