---
'@stati/core': major
---

Templates compose with `stati.include()` and `stati.layout()`, and the functions a site registers for its templates move to a top-level `helpers` option. `stati.include(name, props?, body?)` renders any `.eta` file under the source directory by its path, with props as `stati.props` and optional content as `stati.body`; `stati.layout(name, props?)` wraps a template in another one, so layouts share one page shell instead of repeating it. `stati.include.has()` and `stati.layout.has()` check whether a name resolves. Names are looked up from the page's folder up to the source directory, so a section overrides a template by having one at the same path; `/name` reads from the source directory and `./name` is relative to the calling template. Templates call helpers as `stati.helpers.name()`, and the dev server suggests the right name for a misspelled helper or a call without `helpers.`.

Pages render only the templates they use. Stati lists the templates once per build, records the templates each page rendered and the names it looked up, and rebuilds a cached page when one of them changes, disappears or would now resolve to another file. The dev server rebuilds only the pages a template change affects, and nothing when no page uses the template. The build metrics count the distinct templates each page rendered (`templatesLoaded`) and add `templateRenders`, `includeCacheHits`, `templatesIndexed`, and the `templateIndexMs`, `markdownRenderTotalMs` and `postRenderTotalMs` phases, so the time pages spend outside their templates is no longer unaccounted for; the HTML report has a new design, nests the steps of page rendering under it, and records page times to fractions of a millisecond. Stati now uses Eta 4.

Upgrading, as described in the [upgrade guide](https://stati.build/getting-started/upgrading-to-2):

- `stati.partials` is removed: `stati.partials.header` becomes `stati.include('_partials/header')`, with the partial's path in place of its name, and `'card' in stati.partials` becomes `stati.include.has('_partials/card')`.
- The `eta` config option is removed: `eta: { filters }` becomes `helpers`, and `stati.formatDate()` becomes `stati.helpers.formatDate()`. A helper named after a key of `stati`, such as `slugify`, no longer replaces Stati's value.
- Eta's own `include()`, `includeAsync()`, `layout()`, `block()` and `blockAsync()` are blocked; use `stati.include()`, `stati.layout()` and layout props.
- A `layout` in front matter is looked up from the page's folder like other names, so on a page in a folder with a template of the same name, write `layout: /name` for the root one. A `layout` that names no template now logs a warning.
- Unused partials no longer render, so their errors and warnings go away.
- Included templates render synchronously, so `await` in one is an error.
- A missing include in a production build renders nothing and logs an error, instead of writing the page with the fallback HTML.
- `this` in a helper is the helpers object.
- The first build after upgrading re-renders every page once, because the cache records templates differently.
