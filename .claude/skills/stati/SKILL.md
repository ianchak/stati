---
name: stati
description: 'Build, extend, debug, and deploy websites with Stati, the TypeScript-first static site generator at stati.build. Use for Stati SSG projects, create-stati scaffolding, stati.config.ts or stati.config.js, Markdown/frontmatter, Eta .eta layouts and shells, stati.include() components and props, stati.helpers, collections, navigation, Tailwind/Sass, client TypeScript bundles, SEO, search, sitemap, robots, RSS, ISG caching, build hooks, and dev/preview errors. Also use when explaining, documenting, or reviewing what a Stati feature does, including Stati docs, examples, starter templates, and feature lists. Enforces Stati-specific template rules instead of assuming generic Eta, EJS, Astro, or Eleventy behavior.'
---

# Building websites with Stati

Use this skill to deliver working Stati sites, not to modify the generator unless
explicitly asked. It is also the reference for explaining, documenting, or
reviewing how a Stati feature behaves: the references record behavior checked
against source and tests, including where the official docs overstate it. Stati is a TypeScript-first static site generator:
<https://stati.build/>. This bundle is not a claim of official endorsement.

## Load the right references

Read **[Eta and components](./references/eta.md) before changing any template**.
Read the other references that match the work; do not load everything by default.

| Work                                                   | Required reference                                         |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| Installing, discovering, or invoking this skill        | [Installation and discovery](./references/installation.md) |
| New site, commands, dev/preview, deployment, failures  | [Workflow and operations](./references/workflow.md)        |
| Markdown, frontmatter, URLs, navigation, listings      | [Content and routing](./references/content.md)             |
| Layouts, shells, includes, props, helpers, attributes  | [Eta and components](./references/eta.md)                  |
| Configuration, CSS, static assets, client bundles      | [Configuration and assets](./references/configuration.md)  |
| SEO, search, sitemap, robots, RSS, hooks, ISG, metrics | [Features and lifecycle](./references/features.md)         |
| Complete starter and reusable patterns                 | [Recipes](./references/recipes.md)                         |
| Official docs, source, tests, version discrepancies    | [Resource directory](./references/resources.md)            |

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
   Eta layouts render pages and share one shell through `stati.layout()`;
   templates in `site/partials/` are reusable components included with
   `stati.include()`. Use frontmatter, config helpers, and hooks for data
   preparation. Browser interactivity is authored separately, not magically hydrated.
4. **Implement end to end.** Wire pages, layouts, components, navigation, CSS,
   browser code, assets, metadata, and relevant generated files. Every linked
   route needs a source: a Markdown page, `paginate` for numbered listing pages,
   or a `[tag].md` template for one page per tag (core 1.29+). Stati does not
   generate routes merely because a template links to them.
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
  Markdown, include results and `stati.body` raw, but never untrusted strings or
  arbitrary frontmatter as raw HTML. Escaping does not validate URL schemes.
- Link to the site's own pages and files with `stati.url(path)` (core 2.5+), for
  example `href="<%= stati.url('/about') %>"` and `src="<%= stati.url(post.url) %>"`.
  It adds the path of `site.baseUrl` for a site served from a subfolder and returns
  the path unchanged otherwise, so templates that use it build the same on both.
  Hand-written `href="/…"` and `src="/…"` break under a base path.
- Make an HTML attribute's entire dynamic value one expression:
  `class="<%= stati.propValue('card', active && 'is-active') %>"`,
  ``href="<%= `#${entry.id}` %>"``. Do not splice expressions into static
  attribute fragments. This is the Stati documentation's authoring convention,
  not a general assertion about all Eta engines.
- Include templates by **path** without `.eta` (core 2.0+):
  `<%~ stati.include('partials/card', { title: 'Hello' }) %>`. A plain name is
  looked up from the page's folder up to the source root, nearest first, so a
  section overrides a template by having one at the same path; `/name` reads from
  the source root only; `./name` is relative to the calling template. Any `.eta`
  file under the source directory can be included; underscore folders are not needed.
- Props live in `stati.props`, never as injected local variables, and nested
  includes receive only the props they are given. The third argument is content
  the template prints raw as `stati.body`.
- Templates render only where they are included, synchronously: no `await` in an
  included template. A template that includes itself without props is a cycle.
- Share the page shell instead of repeating it: each layout calls
  `<% stati.layout('base', props?) %>` and `base.eta` prints `<%~ stati.body %>`.
  Eta's own `include()`, `layout()` and `block()` are blocked; pass extra regions
  to a shell as props.
- On a collection item (`PageModel`), use `post.frontMatter.title`, not
  `post.title`. Current-page frontmatter is flattened into `stati.page`; collection
  items are not.
- Never assume a collection, page nav node, props, bundle, or search index exists.
  Use actual collection membership and guarded APIs. For optional templates, use
  `stati.include.has(name)`; for optional helpers, `'name' in stati.helpers`, not a
  truthiness read that can activate an error proxy.
- Read listings from `stati.collection` (any page can name one with
  `collection: /blog`), `stati.pagination` and `stati.generated`, not from data
  a `beforeAll` hook hands to helpers: Stati records which pages read collections
  and the navigation, and rebuilds them when that data changes (core 1.29+).
- A section `layout.eta` **replaces** its ancestor `layout.eta`; both can wrap
  themselves in the same shell. Explicit frontmatter `layout` values are template
  names **without `.eta`**, looked up like includes (`layout: /layout` for the
  root one). `index.eta` is an aggregation layout, not an independent content page.
- Helpers are explicitly registered in the top-level `helpers` config object and
  called as `stati.helpers.name(value)` (core 2.0+). No pipes, arbitrary Eta config
  passthrough, automatic built-in formatting helpers, or component imports are implied.
- Keep filesystem paths, source-relative template identifiers, and public URLs
  distinct. Use platform-native filesystem operations and `/` in URLs.
- ISG is build-time caching, not request-time regeneration on a static host.
- Avoid manually duplicating auto-injected SEO, search metadata, or bundle tags.
- Do not assume framework features such as MDX, React/Vue components, hydration,
  CMS routing, or internationalization. Pagination (`paginate`) and generated
  pages (`[param].md`) exist from core 1.29 and are opt-in per page; they are not
  automatic. Verify an API, and the installed version, before using it.
- Images: core (1.28+) sizes Markdown images and lazy-loads them on its own.
  Responsive variants and generated Open Graph cards exist only with the
  `@stati/images` package installed and `images.responsive` / `images.og` on; do
  not assume them otherwise. Raw `<img>` HTML is never processed.

## Portable use and maintenance

Add or update this skill with the `skills` CLI, not by copying files:
`npx skills add ianchak/stati --skill stati -a claude-code --copy -y` to add it,
`npx skills update stati -p` to update it. Do not edit the installed copy or
delete `skills-lock.json`; see [installation](./references/installation.md#add-or-update-the-skill).

- **Claude Code (terminal or its VS Code extension):** `.claude/skills/stati/`.
  Claude Code does not normally discover `.github/skills/` as native project
  skills.
- **GitHub Copilot in VS Code:** `.claude/skills/stati/` or
  `.agents/skills/stati/`. Using a Claude model in Copilot does not change the
  host application's discovery rules.
- For both of these applications, prefer **one copy** in `.claude/skills/stati/`.
  Other agents use `.agents/skills/` (`-a universal`); verify their documented
  locations.

Keep the folder named `stati`, matching frontmatter. Discovery makes the skill
available, but does not guarantee automatic invocation for every relevant
request. See [installation and discovery](./references/installation.md) for
verification, explicit invocation, and an optional project instruction.
Tool names are intentionally not hardcoded: use the host agent's file, shell,
browser, and documentation tools.

The bundled [starter](./assets/starter/) is a small plain-CSS authoring example,
not a replacement for `create-stati`'s styling installers.
[Recipes](./references/recipes.md) describes how to copy and build it.

Verified against Stati core **1.24.1**, Eta **3.5.0**, source revision
`64df3241ad897fe479d9b8fb7723752d25fe9f07`, and live documentation on
**2026-10-10**; collections, pagination and generated pages against core
**1.29** on **2026-10-15**; includes, shells and helpers against core **2.0** with Eta **4.6** on
**2026-10-18**; Markdown rendering with markdown-it **15** and markdown-it-prism **4** on
**2026-10-19**; site-wide SEO defaults against core **2.1** and the 404 page defaults
against the core **2.2** branch on **2026-10-23**; hashed stylesheets against the
source and tests on **2026-10-24**; the base path and `stati.url()` against the
source and tests on **2026-10-25**. See [resources](./references/resources.md) for authority rules and
known discrepancies. When upgrading, recheck the contracts and rerun
[the bundled smoke test](./scripts/smoke-test.mjs) from an installed Stati project;
it builds only an isolated temporary fixture and checks its generated output.
