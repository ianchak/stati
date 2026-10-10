---
name: stati
description: 'Build, extend, debug, and deploy websites with Stati, the TypeScript-first static site generator at stati.build. Use for Stati SSG projects, create-stati scaffolding, stati.config.ts or stati.config.js, Markdown/frontmatter, Eta .eta layouts, stati.partials components and props, collections, navigation, Tailwind/Sass, client TypeScript bundles, SEO, search, sitemap, robots, RSS, ISG caching, build hooks, and dev/preview errors. Enforces Stati-specific template rules instead of assuming generic Eta, EJS, Astro, or Eleventy behavior.'
---

# Building websites with Stati

Use this skill to deliver working Stati sites, not to modify the generator unless
explicitly asked. Stati is a TypeScript-first static site generator:
<https://stati.build/>. This bundle is not a claim of official endorsement.

## Load the right references

Read **[Eta and components](./references/eta.md) before changing any template**.
Read the other references that match the work; do not load everything by default.

| Work                                                   | Required reference                                        |
| ------------------------------------------------------ | --------------------------------------------------------- |
| New site, commands, dev/preview, deployment, failures  | [Workflow and operations](./references/workflow.md)       |
| Markdown, frontmatter, URLs, navigation, listings      | [Content and routing](./references/content.md)            |
| Layouts, partials, props, filters, HTML attributes     | [Eta and components](./references/eta.md)                 |
| Configuration, CSS, static assets, client bundles      | [Configuration and assets](./references/configuration.md) |
| SEO, search, sitemap, robots, RSS, hooks, ISG, metrics | [Features and lifecycle](./references/features.md)        |
| Complete starter and reusable patterns                 | [Recipes](./references/recipes.md)                        |
| Official docs, source, tests, version discrepancies    | [Resource directory](./references/resources.md)           |

## Workflow

1. **Establish the project and version.** Inspect the site's package manifest,
   lockfile, config, scripts, directory layout, existing templates, and deployment
   settings. Distinguish a generated site from the Stati monorepo. Prefer the
   installed version's runtime/types over a newer documentation example.
2. **Clarify material decisions.** For a new site, establish purpose, content
   structure, branding, styling choice, TypeScript/JavaScript preference, and
   deployment domain/path. Preserve existing choices. Ask about ambiguities that
   would substantially change the implementation; do not silently add a framework.
3. **Choose the smallest Stati-native solution.** Markdown is the page source;
   Eta layouts are complete documents; underscore-directory partials are reusable
   components. Use frontmatter, config filters, and hooks for data preparation.
   Browser interactivity is authored separately, not magically hydrated.
4. **Implement end to end.** Wire pages, layouts, components, navigation, CSS,
   browser code, assets, metadata, and relevant generated files. Create actual
   content pages for links to tags, feeds, archives, pagination, or languages;
   Stati does not generate those routes merely because a template links to them.
5. **Build and inspect output.** Use the site's scripts. A successful exit code
   is insufficient: inspect expected page files, rendered content/components,
   asset URLs, metadata, and warning/error output. Fallback HTML and HTML error
   comments are failures, not successful designs.
6. **Exercise the browser when available.** Check responsive layouts, keyboard
   access, focus, navigation, anchors, theme controls, search, missing assets,
   console errors, and the static production preview. Never infer production
   correctness solely from a working development server.
7. **Report precisely.** State what changed, what was validated, and any remaining
   limitation. Do not promise "perfect" proficiency, features, or tests unsupported
   by evidence.

## Non-negotiable authoring rules

- Use `stati`, not Eta's usual `it`, for template data.
- Write **JavaScript**, not TypeScript annotations, assertions, or JSX, inside
  `.eta` tags. TypeScript-first tooling does not transpile template JavaScript.
- `<%= value %>` escapes text; `<%~ trustedHtml %>` emits HTML. Insert rendered
  Markdown and partial results raw, but never untrusted strings or arbitrary
  frontmatter as raw HTML. Escaping does not validate URL schemes.
- Make an HTML attribute's entire dynamic value one expression:
  `class="<%= stati.propValue('card', active && 'is-active') %>"`,
  ``href="<%= `#${entry.id}` %>"``. Do not splice expressions into static
  attribute fragments. This is the Stati documentation's authoring convention,
  not a general assertion about all Eta engines.
- Only `.eta` files recursively inside immediate underscore-prefixed folders at
  the page's source-directory ancestry are auto-discovered partials. Names are
  exact **basenames**, not namespaces, paths, or camel-case conversions.
- Call components with `<%~ stati.partials.card({ title: 'Hello' }) %>`.
  Props live in `stati.props`, never as injected local variables.
- All discovered partials are pre-rendered without props. Make component-only
  templates safe for that pass, normally using
  `<% if (!stati.props) { return; } %>`. An empty props object does not trigger a
  fresh render.
- Nested components must receive their props explicitly. Avoid circular
  references and deep pre-render dependency chains; pre-rendering is bounded,
  not an unlimited dependency resolver.
- On a collection item (`PageModel`), use `post.frontMatter.title`, not
  `post.title`. Current-page frontmatter is flattened into `stati.page`; collection
  items are not.
- Never assume a collection, page nav node, props, bundle, or search index exists.
  Use actual collection membership and guarded APIs. For optional partials, use
  `'name' in stati.partials`, not a truthiness read that can activate an error proxy.
- A section layout **replaces**, rather than wraps, its ancestor layout.
  Explicit `layout` values are source-root-relative names **without `.eta`**.
  `index.eta` is an aggregation layout, not an independent content page.
- Filters are explicitly registered in `eta.filters` and called as
  `stati.filterName(value)`. No pipes, arbitrary Eta config passthrough, automatic
  built-in formatting helpers, or component imports are implied.
- Keep filesystem paths, source-relative template identifiers, and public URLs
  distinct. Use platform-native filesystem operations and `/` in URLs.
- ISG is build-time caching, not request-time regeneration on a static host.
- Avoid manually duplicating auto-injected SEO, search metadata, or bundle tags.
- Do not assume framework features such as MDX, React/Vue components, hydration,
  image optimization, CMS routing, automatic pagination, or internationalization.
  Verify an API before using it.

## Portable use and maintenance

Copy this **entire folder**, including references and assets, to a site's
`.github/skills/stati/`. Compatible agents may instead use `.agents/skills/stati/`,
`.claude/skills/stati/`, or their personal skill directory. Keep the folder named
`stati`, matching frontmatter. Do not install duplicate copies in the same agent's
discovery paths. Tool names are intentionally not hardcoded: use the host agent's
file, shell, browser, and documentation tools.

The bundled [starter](./assets/starter/) is a small plain-CSS authoring example,
not a replacement for `create-stati`'s styling installers.
[Recipes](./references/recipes.md) describes how to copy and build it.

Verified against Stati core **1.24.1**, Eta **3.5.0**, source revision
`64df3241ad897fe479d9b8fb7723752d25fe9f07`, and live documentation on
**2026-10-10**. See [resources](./references/resources.md) for authority rules and
known discrepancies. When upgrading, recheck the contracts and rerun
[the bundled smoke test](./scripts/smoke-test.mjs) from an installed Stati project;
it builds only an isolated temporary fixture and checks its generated output.
