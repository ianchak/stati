# create-stati

## 2.7.1

### Patch Changes

- bc89084: New sites start on `@stati/cli` ^2.4.1 and `@stati/core` ^2.10.0, and the image tools option adds `@stati/images` ^1.1.1.

## 2.7.0

### Minor Changes

- d9ad4c4: add the base path to the search index

### Patch Changes

- d9ad4c4: require @stati/core 2.5 in the docs starter

## 2.6.2

### Patch Changes

- f4e7f1b: A page that rendered with an error in a production build is rendered again, and its error logged again, on every build until it is fixed

## 2.6.1

### Patch Changes

- e27f093: update documentation

## 2.6.0

### Minor Changes

- 6b4d646: add word count and reading time to pages

### Patch Changes

- 6b4d646: skip unclosed and list-item code fences in word counts

## 2.5.0

### Minor Changes

- f1a4ea5: add Google News sitemap

### Patch Changes

- f1a4ea5: keep the news starter's core range installable

## 2.4.0

### Minor Changes

- 0f5e34e: add news starter template

## 2.3.4

### Patch Changes

- a522376: read numeric, boolean and date front matter titles, descriptions and tags as text instead of crashing the build

## 2.3.3

### Patch Changes

- add context7.json to index Stati docs with Context7

## 2.3.2

### Patch Changes

- refresh benchmark baselines and drop the unchecked p95
- cut benchmark headroom to 25ms so 2x slowdowns fail

## 2.3.1

### Patch Changes

- 0efb2c8: New sites start on `@stati/cli` ^2.1.0 and `@stati/core` ^2.3.0, and the image tools option adds `@stati/images` ^1.0.1.

## 2.3.0

### Minor Changes

- 05ba683: `--agent-skill` installs the Stati agent skill with the `skills` CLI (`npx skills add ianchak/stati --skill stati`) instead of copying the one bundled in the package. It writes `skills-lock.json`, so `npx skills@1 update stati -p` keeps the skill current, and create-stati prints that command after installing. Installing the skill now needs `git` and network access; when it fails, the site is still created, anything the failed install wrote is removed, and create-stati prints the reason and the command to add the skill later. The `.github/skills` choice is gone: `--agent-skill=github` still works but installs to `.agents/skills/stati`, which Copilot reads.

## 2.2.0

### Minor Changes

- 7c360d2: Tailwind projects build their CSS with `stati build --tailwind-input --tailwind-output` instead of a `build:css` script. Sass projects compile into `public/styles.css` before `stati build`, which the generated `.gitignore` lists, so production builds link the stylesheet under a name that changes with its content.

## 2.1.2

### Patch Changes

- 222d81e: require @stati/core 2.2 in the starter templates

## 2.1.1

### Patch Changes

- 06bed4e: The blog and docs templates no longer leave their 404 page out of the sitemap and search themselves or mark it `noindex`, and `--images` no longer writes `og: { exclude: ['/404'] }`: `@stati/core` 2.2 does all of this for every site. The bundled Stati agent skill describes the 404 page defaults.

## 2.1.0

### Minor Changes

- b850242: The blog template shares its posts as articles: `seo.articles` matches `/posts/*`, so a post's link preview carries its publish date, `updated` date and tags. The author in `stati.config.js` has a commented-out `twitter` handle for `twitter:creator`. The bundled Stati agent skill describes the site-wide SEO defaults of `@stati/core` 2.1.

## 2.0.1

### Patch Changes

- update @stati/cli and @stati/core to version 2.0.0 in package.json and package-lock.json

## 2.0.0

### Major Changes

- 8ba675f: New sites use Stati 2: `@stati/core` and `@stati/cli` 2, and the starters' templates are written for them. Their shared pieces move from `site/_partials/` to `site/partials/` and are included with `stati.include()`; the blog and docs templates keep the page around their layouts in one `site/base.eta`, named with `stati.layout()`, and register their functions as `helpers`, called as `stati.helpers.formatDate()` and `stati.helpers.docsSections()`. The blog archive names the site layout as `layout: /layout`. The bundled agent skill documents includes, shells, helpers and the template names they take, and its starter and smoke test use them.

### Minor Changes

- 704277f: New docs sites use markdown-it-prism 4, which puts a code block's `language-*` class on `<code>` only. The docs template reads the language from there, so code blocks keep their highlighting, label and copy button.
- 4d1927c: Sites created with `--styling=tailwind` use Tailwind CSS 4: `tailwindcss` and `@tailwindcss/cli` replace Tailwind CSS 3, `autoprefixer` and `postcss`. Tailwind is configured in `src/styles.css`, so there is no `tailwind.config.js`; the stylesheet imports Tailwind and adds an `@source` rule for `.stati/tailwind-classes.html`, which Tailwind would otherwise skip because `.stati/` is gitignored. The blog and docs templates keep their own stylesheet in Tailwind's `components` layer, where it overrides Tailwind's base styles and utility classes override it; both render as they did with Tailwind CSS 3.
- cb0e35e: New TypeScript projects get TypeScript 6: their `typescript` dev dependency is `^6.0.3`.

### Patch Changes

- 2ff7340: New blank sites get a placeholder `site.baseUrl`, which the config type requires, so their TypeScript config type-checks as generated. Sites set up with Tailwind no longer keep `public/styles.css`: every build copied it over the compiled `dist/styles.css`, so under `stati dev` the Tailwind styles could disappear after an edit.

## 1.17.2

### Patch Changes

- 1f8707e: The bundled Stati agent skill describes TypeScript bundle `include`/`exclude` patterns correctly: they match page URLs such as `/docs/guide`, not output files such as `/docs/guide.html`, and `/docs/**` does not match the `/docs` page. Its smoke test now checks that a repeat build reuses every cached page.

## 1.17.1

### Patch Changes

- c26ed9f: `@stati/cli` requires `@stati/core` `^1.29.0`. New sites depend on `@stati/core` `^1.29.0` and `@stati/cli` `^1.15.4`.

## 1.17.0

### Minor Changes

- b7f6663: The blog template now uses Stati's collections: every tag has its own page at `/tags/<tag>`, generated from `site/tags/[tag].md`, the home page lists five posts at a time with links to `/page/2` and on, and the archive moves to `/posts`. Listings read `stati.collection`, so the blog uses no build hooks anymore: `helpers/blog.js` keeps only template filters for related posts and dates, and retitling a post rebuilds the pages that list it instead of the whole blog. Link previews come from Stati's built-in SEO tags; posts no longer get article Open Graph tags or `BlogPosting` structured data, and a post's preview image moves from `image` to `seo.openGraph.image` in its front matter. The blog and docs templates no longer give every page a default link-preview image: a page shows the image its front matter sets, or with image tools installed, the card drawn for it. The bundled agent skill documents collections, pagination, generated pages and how ISG tracks them.

## 1.16.1

### Patch Changes

- c09477d: New projects and the CLI now require @stati/core 1.28.0, the release that adds image sizes, responsive images and Open Graph cards.

## 1.16.0

### Minor Changes

- 9b7c08d: New sites can add image tools: answer yes to the new prompt, or pass `--images`, to install `@stati/images` and turn on responsive images and link preview cards. The blog and docs templates then keep their own card template, `site/og.eta`, with its fonts; the blank template uses the built-in card and gets a `site.baseUrl`. Without image tools nothing changes. The blog and docs starters stop forcing their default social image onto every page when cards are generated, the style guide shows a captioned Markdown image, and the bundled agent skill documents Stati's image features.

## 1.15.5

### Patch Changes

- 5bb2dba: Read page publish dates the same way everywhere. `PageModel.publishedAt`, and with it `stati.collection.recentPages` and navigation order, now accepts unquoted YAML dates (`publishedAt: 2026-01-01`) and falls back to `published`, `date` and `createdAt`, matching ISG aging. RSS sorting and the default `pubDate` use the same fields and skip invalid values instead of stopping at them. Invalid dates are reported with a warning. The `FrontMatter` type now allows `Date` for `publishedAt` and `date`, and the bundled Stati agent skill describes the new behavior.

## 1.15.4

### Patch Changes

- d2ef0c0: In the dev server, reading an unknown `stati.*` property in an Eta template now fails with the template file, line, and a "Did you mean" suggestion in the error overlay. The bundled agent skill documents the check.

## 1.15.3

### Patch Changes

- 77d3f5e: Upgrade yargs to 18 in `@stati/cli` and require Node.js `^22.12.0 || >=24`. The published packages now declare this in `engines`, and new projects from `create-stati` declare it too. Node 22.0–22.11 is no longer supported because yargs 18 requires 22.12 or later.

## 1.15.2

### Patch Changes

- 82bd60e: New projects created with create-stati now depend on `@stati/core` ^1.26.1 and `@stati/cli` ^1.15.1.

## 1.15.1

### Patch Changes

- 20aed75: upgrade ESLint 9 to 10

  Errors that wrap a lower-level failure (file system operations, cache manifest saves, build and dev server locks, ISG config validation, Tailwind executable lookup, and create-stati styling and package.json setup) now keep the original error as `cause`. Messages are unchanged.

## 1.15.0

### Minor Changes

- enforce single-line commit messages with trailers

## 1.14.3

### Patch Changes

- 814e3cf: Update the bundled Stati agent skill: it now also triggers when explaining, documenting or reviewing what a Stati feature does, and its content reference covers listing a section from another page with `stati.nav.getChildren()`.

## 1.14.2

### Patch Changes

- 4b0bd14: Align the CLI and scaffolded starter dependencies with the latest Stati package versions (`@stati/core` 1.24.5, `@stati/cli` 1.14.2).

## 1.14.1

### Patch Changes

- 169720b: Align the CLI and scaffolded starter dependencies with the latest Stati package versions (`@stati/core` 1.24.4, `@stati/cli` 1.14.1).

## 1.14.0

### Minor Changes

- 2ac2a9b: Add a blog template

  `create-stati my-blog --template blog` scaffolds a complete blog that
  works on first run. Its sample posts explain how each part works.
  - Markdown posts with tags, a yearly archive, newer/older links and
    related posts, built from a post index in `helpers/blog.js` that is
    exposed to templates as filters such as `stati.blogPosts()`.
  - RSS feed, sitemap, `robots.txt`, Open Graph and Twitter tags, and
    `BlogPosting` structured data.
  - Drafts, a 404 page, a default link-preview image, and light and dark
    themes with a self-hosted display face.

  The scaffolder now keeps a template's own config and styles:
  - The blog's `stati.config.js` is kept, and becomes `stati.config.ts`
    with `typescript.enabled` for TypeScript projects.
  - With Tailwind or Sass the blog's stylesheet moves into `src/` instead
    of being replaced by the blank starter's styles.
  - Unknown `--template` values are rejected with the list of templates,
    and the interactive prompt offers Blog.
  - The bundled agent skill lists the new template.

- 1486c8a: Add a docs template

  `create-stati my-docs --template=docs` scaffolds a complete
  documentation site that works on first run. Its sample pages explain how
  each part works.
  - A sidebar built from folders: each top-level folder is a section and
    each Markdown file a page, ordered by `order` in front matter, with
    section overview pages, previous/next links and breadcrumbs. The
    grouping lives in `helpers/docs.js` and reaches templates as filters
    such as `stati.docsSections()`.
  - Ctrl/Cmd+K search over Stati's search index, an on-page table of
    contents that tracks the section in view, heading links, and code
    blocks highlighted at build time with a copy button.
  - Light and dark themes with a toggle, a mobile navigation drawer,
    self-hosted Inter, a sitemap, `robots.txt`, link previews and
    breadcrumb structured data, drafts and a 404 page.

  The interactive prompt offers Docs, and the bundled agent skill lists
  the new template.

- 392d0cd: Make TypeScript the default for new projects

  The TypeScript prompt now defaults to yes, and non-interactive runs
  create a TypeScript project unless told otherwise. A default project
  gets `stati.config.ts`, `tsconfig.json` and `src/main.ts`.
  - Added `--no-typescript` (alias `--no-ts`) to scaffold a JavaScript
    project with `stati.config.js`.
  - Scripts that pass every option and relied on the old JavaScript
    default should add `--no-typescript`.
  - The bundled agent skill lists the new flag.

## 1.13.0

### Minor Changes

- 0e4cadf: add resource directory and workflow documentation

  This commit introduces comprehensive documentation for the Stati

- 0e4cadf: add Stati agent skill installation option

  The scaffolder now includes an option to install the Stati agent skill for AI coding assistants. Users can choose to install the skill during project setup, with targets for Claude Code, GitHub Copilot, and generic agents. The skill bundle is copied into the project, allowing AI tools to follow Stati's conventions for content and templates.

## 1.12.1

### Patch Changes

- 05bd4ee: Align the CLI and scaffolded starter dependencies with the latest Stati package versions.

## 1.12.0

### Minor Changes

- a785e03: add CSS watcher diagnostics and slowdown check script
  - Introduced a new script to check for dev server rebuild slowdown.

## 1.11.10

### Patch Changes

- 38374fd: address memory leak during development sessions

  Added a dedicated test for memory leaks in the dev server by

## 1.11.9

### Patch Changes

- 1f37feb: update esbuild to version 0.28.1 in package.json

  Updated the esbuild dependency from version 0.27.0 to 0.28.1 to

## 1.11.8

### Patch Changes

- 7ba43f5: standardize punctuation in documentation for consistency

## 1.11.7

### Patch Changes

- 480ba92: Update logger utilities to use new color system

## 1.11.6

### Patch Changes

- 5012b1a: ### Updated template dependencies
  - Updated blank template to use `@stati/cli` ^1.11.0 and `@stati/core` ^1.18.0

## 1.11.5

### Patch Changes

- 6c2e4ec: simplify file copying logic in copyDirectory method
- 6c2e4ec: simplify project name assignment logic in parseArgs

## 1.11.4

### Patch Changes

- update @stati/core to version 1.16.0 across all packages

## 1.11.3

### Patch Changes

- exclude docs-site from compilation
- Releasing 3 package(s)

  Releases:

## 1.11.2

### Patch Changes

- a0c63fa: restructure to support multiple bundles
- a0c63fa: update dependencies to latest versions

## 1.11.0

### Minor Changes

- a178a68: add browser globals for TypeScript files in eslint config

## 1.10.0

### Minor Changes

- 38da83e: add TypeScript support types and esbuild dependency
- 38da83e: add validation for single </body> tag in layout
- 38da83e: add TypeScript processor and CLI support
  - Created typescript-processor.ts with setupTypeScript, generateTsConfig, generateMainTs

### Patch Changes

- 38da83e: add TypeScript support tests
  - Added typescript.utils.test.ts with tests for compileTypeScript, compileStatiConfig, cleanupCompiledConfig

- 38da83e: add TypeScript documentation
  - Updated create-stati README with --typescript flag and TypeScript section

## 1.9.5

### Patch Changes

- 26252d9: replace rimraf with node fs methods for cleaning

## 1.9.4

### Patch Changes

- resolve #74 cleanup script error

## 1.9.3

### Patch Changes

- 65f4d31: allow macOS temporary folders when creating a project (72)

## 1.9.2

### Patch Changes

- 832b5de: update documentation links to point to new site URL

## 1.9.1

### Patch Changes

- update @stati/cli and @stati/core to latest versions

## 1.9.0

### Minor Changes

- ccca616: add Tailwind CSS build and watch commands to CLI
- ccca616: add silent watch script for Tailwind CSS processing

## 1.8.0

### Minor Changes

- update next steps message to use package manager

## 1.7.0

### Minor Changes

- a10572a: add support for package manager selection and install options
- a10572a: add tests for project scaffolding and package manager handling
- efe254f: add support for package manager selection and install options

### Patch Changes

- a10572a: enhance tests for error handling and package manager detection
- a10572a: simplify package manager assignment in runCLI function
- a10572a: update installation instructions for additional package managers
- a10572a: extract CSS processor configuration

  Create configuration-driven approach for CSS processors to reduce duplication

- a10572a: enforce type for package manager in installDependencies
- a10572a: improve directory path validation and normalization
- a10572a: extract package.json manipulation utilities
  - Create src/utils/package-json.ts with reusable helpers

- a10572a: extract error formatting utility

  Extract repeated error formatting pattern into reusable utility function.

- a10572a: extract process spawning utilities
  - Create src/utils/process.ts with spawnProcess and isCommandAvailable helpers

- a10572a: add barrel export and update all imports
  - Create src/utils/index.ts as barrel export for all utilities

- a10572a: add comprehensive tests for error and package JSON utilities
- a10572a: correct regex pattern for directory path validation
- a10572a: unify logging with shared logger
  - Create src/utils/logger.ts with colored output helpers

- a10572a: centralize dependency versions

  Extract hardcoded version strings to constants.ts for single source of truth.

- a10572a: add tests for git initialization and directory handling
- a10572a: simplify error handling and logging
- a10572a: reorganize utility functions naming and improve validation logic
- a10572a: use global timeout functions for better compatibility

## 1.6.9

### Patch Changes

- c4f6a32: update documentation for SEO, templates, and routing

## 1.6.8

### Patch Changes

- update @stati/cli and @stati/core versions

## 1.6.7

### Patch Changes

- update package.json metadata fields

## 1.6.6

### Patch Changes

- correct coverage range and configuration settings

## 1.6.5

### Patch Changes

- add coverage range configuration to codecov.yml

## 1.6.4

### Patch Changes

- 33c2d31: update links in RSS documentation for consistency
- 2eaf13b: add build step to pre-commit hook

## 1.6.3

### Patch Changes

- add repository field to package metadata
- enhance CI workflows and add changeset bot for automation
- Releasing 3 package(s)

  Releases:

## 1.6.2

### Patch Changes

- add repository field to package metadata
- enhance CI workflows and add changeset bot for automation

## 1.6.1

### Patch Changes

- update build scripts to include CSS copy step

  Commit: 5f90bbc

- update @stati/cli and @stati/core versions

  Commit: 7077cfe

- update @stati/cli and @stati/core versions

  Commit: 6eb730a

- update build script order for consistency

  Commit: c8ced26

## 1.6.0

### Minor Changes

- enhance navigation with dynamic section rendering and styles

  Commit: 4ab7152

- add dynamic class tracking and inventory management

  Commit: b7485d4

### Patch Changes

- update links to configuration and documentation resources

  Commit: 34c58f8

- remove outdated examples and configuration references

  Commit: 43ab1d1

- add order field to documentation index files

  Commit: afae959

## 1.5.0

### Minor Changes

- add initial codecov configuration for coverage reporting

  Commit: 5fcfbd9

- add sitemap configuration with priority rules

  Commit: b9d2a3c

- add robots configuration to enable sitemap

  Commit: 4d33078

### Patch Changes

- update Codecov configuration to disable require_changes option

  Commit: 9c9fc69

- correct link reference for robots.txt configuration

  Commit: 2d13853

## 1.4.1

### Patch Changes

- update coverage configuration to include additional patterns

  Commit: 1bf51dd

- update CI workflow to include coverage reporting

  Commit: c6b9c9f

- update README to fix Docs badge link and remove Bundle Size badge

  Commit: 924821e

- add coverage configuration for testing

  Commit: 623178c

- update README with badges for build, coverage, npm version, and more

  Commit: 3d96d09

- enhance documentation for Stati CLI, Core, and Create Stati

  Commit: adc2c63

- fix indentation in CI workflow for Codecov action

  Commit: 283ad35

## 1.4.0

### Minor Changes

- enhance scroll position handling and styling for active links

  Commit: 787715d

### Patch Changes

- refactor SEO documentation

  Commit: 20b8920

- remove unused sanitizeStructuredData function and documentation

  Commit: ba8819f

- remove unused directories field from package.json

  Commit: fc486f5

- update links in README and configuration for new documentation site

  Commit: 0c310a6

- update introduction and features for clarity and conciseness

  Commit: d667848

- add author information to package.json

  Commit: 3ead32d

- enhance heading styles with drop shadow and tighter spacing

  Commit: c3fc1f4

- improve active link highlighting with section-specific classes

  Commit: 280a641

- update partials section to reflect correct paths

  Commit: 6131168

- add hero image

  Commit: 67f944f

- add comprehensive SEO API reference and configuration guide

  Commit: 7f91a5c

- remove unnecessary animation classes from sections

  Commit: 5f7eb29

- update recipe collection for clarity and structure

  Commit: 6198390

- enhance SEO section with detailed features and configuration

  Commit: 5fc33d2

- update license information to include author details

  Commit: a557204

## 1.3.4

### Patch Changes

- update devDependencies for @stati/cli and @stati/core

  Commit: 3e876dd

- update @stati/cli and @stati/core versions

  Commit: aa9fccf

## 1.3.3

### Patch Changes

- update project creation instructions and testing details

  Commit: a8459e5

- update @stati/cli and @stati/core versions

  Commit: 470c81d

- update @stati/cli and @stati/core versions

  Commit: 19103db

- update usage instructions and template details

  Commit: adc6691

- clarify additional template examples and update commands

  Commit: 19f0118

- add note for pathspec warnings during versioning

  Commit: 0ce6bc1

## 1.3.2

### Patch Changes

- add generator version information to templates

  Commit: 27a9334

- update @stati/cli and @stati/core to latest versions

  Commit: 45f097c

- update template variable references from 'it' to 'stati'

  Commit: 0bd8e2d

- remove default version fallback in footer display

  Commit: 022f01d

## 1.3.1

### Patch Changes

- Implement code changes to enhance functionality and improve performance

  Commit: d8e8af1

- update @stati/cli and @stati/core versions

  Commit: e2a9edb

## 1.3.0

### Minor Changes

- update documentation scripts for improved functionality

  Commit: 4fb8130

- replace logo SVG with image for improved branding

  Commit: 6c86005

- add link to recipes in the sidebar navigation

  Commit: 27d65ad

- enhance scaffolder documentation and add new options

  Commit: 3f4855b

- replace Nord theme with custom Stati theme for syntax highlighting

  Commit: 6474322

- add stati engine and version information

  Commit: 2a73368

- enhance button styles and add hover effects for better UX

  Commit: 40eaa78

- enhance layout and styling for better UX

  Commit: 4b89abf

- enhance feature icons and descriptions for clarity

  Commit: 862c513

- add CSS validation settings and Tailwind IntelliSense config

  Commit: 382faa8

- enhance documentation site layout and styling

  Commit: 524769c

- implement theme management and toggle functionality

  Commit: 7650528

### Patch Changes

- update build and clean scripts for docs-site

  Commit: 34665fe

- add new API documentation for Hooks and Error Handling; update sidebar links

  Commit: ecd36e3

- remove Vitest configuration file

  Commit: a2fbdb2

- update invalidate command examples for clarity and accuracy

  Commit: e6c8c5f

- remove documentation-related scripts from package.json

  Commit: 61641d0

- update scaffolder documentation for clarity and completeness

  Commit: f38d807

- update features subtitle for clarity and impact

  Commit: 60f08e4

- enhance feature item styling with dynamic colors

  Commit: e5cf34c

- sidebar and header components for improved usability and aesthetics

  Commit: 8a02946

- remove border from logo images for cleaner look

  Commit: 60715b7

- update template context and configuration details for clarity

  Commit: b2a6267

- remove toc.js and integrate TOC functionality in toc.eta

  Commit: 9fec840

- add detailed usage and options for stati preview command

  Commit: 4306e1b

- streamline API documentation and improve examples

  Commit: be7c90e

- untrack generated css

  Commit: b97a6af

- documentation and remove Plugin API section

  Commit: 4fd21fd

- add .gitignore file to exclude unnecessary files

  Commit: 9b47511

- replace logo image with SVG icon for consistency

  Commit: 3209b85

- remove dark mode toggle and theme management script

  Commit: 0c50735

- update and restructure AI coding agent instructions

  Commit: 1aa3be5

- update background decoration comments for clarity

  Commit: 013a3e9

- restructure site metadata and recipes documentation for clarity

  Commit: 37d8213

- update sidebar and documentation for clarity and completeness

  Commit: 854bd3b

- remove outdated documentation files: error handling, feature documentation

  Commit: f26cb4e

- Remove outdated documentation example and update examples index with improved descriptions and structure

  Commit: fa75826

- adjust layout for improved responsiveness and clarity

  Commit: d54b83b

- update development server instructions and CLI command details

  Commit: b90bc60

- improve button class structure for better readability

  Commit: dd26c4d

- remove outdated plugin examples and notes from documentation

  Commit: 40c177b

## 1.2.5

### Patch Changes

- add newline at end of LICENSE file for consistency

  Commit: 73685cf

- update development commands for clarity and consistency

  Commit: 2f922c0

- improve commit parsing for clarity

  Commit: bba9ed6

- separate type imports for clarity and consistency

  Commit: d949272

- clean up redundant test comments
  - Remove obvious comments that don't add value ('Create test files', 'Verify content')

  Commit: 245b02e

- remove outdated refactoring log file

  Commit: 16dabf9

- update license from ISC to MIT and add LICENSE file

  Commit: ddbbed5

- update test:ci script to include build step

  Commit: 2c33fda

## 1.2.4

### Patch Changes

- update Tailwind setup to use src directory

  Commit: 00a3bd3

## 1.2.3

### Patch Changes

- update concurrently version and script prefix

  Commit: 0c22501

## 1.2.2

### Patch Changes

- remove installDependencies option and update CLI

  Commit: 69b5fe5

- update Bun command in README for accuracy

  Commit: e052646

## 1.2.1

### Patch Changes

- update dependencies and improve build scripts

  Commit: 2f21a6a

## 1.2.0

### Minor Changes

- add additional test scripts for blank example project

  Commit: 5e938fc

- implement automated changeset generation script

  Commit: ed82f65

- enhance create-stati CLI with improved argument parsing and options

  Commit: cd5455c

- add comprehensive tests for CSSProcessor and ExampleManager

  Commit: 44d08d3

- ce73559: Implemented milestone 5 with other improvements

### Patch Changes

- remove unused changeset generation script

  Commit: 12c8c8b

- remove blog template example as there are other plans in the future

  Commit: 56c0749

- remove cli-progress dependency and related code

  Commit: ad474a3

- improve error handling for missing directories

  Commit: ea9b405

- update quick start guide and enhance project creation section

  Commit: 26c4364

- remove skipped tests for project creation prompts

  Commit: f1c4e78

- replace chalk with custom ANSI colors for CLI output

  Commit: dae7d28

- update README and CONTRIBUTING for consistency and clarity

  Commit: 7e11b82

- add comprehensive tests for create-stati package

  Commit: 1202811

- add .stati to ignore list and remove cache manifest

  Commit: d8aa7bf

- Implemented milestone 5 with other improvements

  Commit: ce73559

- remove success message display method

  Commit: 680255a

- update CLI commands and ISG features

  Commit: c82964b

- update ISG ttlSeconds to 6 hours for better caching

  Commit: b591c81

## 1.1.0

### Minor Changes

- implement automated changeset generation from commits

  Commit: 66c0c80

- implement automated changeset generation from commits

  Commit: 66c0c80

### Patch Changes

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- update build:ci script to specify package for npm exec

  Commit: c03d034

- fix build command in CI workflow

  Commit: 5bb2f90

- update CI scripts for linting and type checking in examples

  Commit: a37fdb0

- add comprehensive README for Stati CLI, Core, and Create-Stati

  Commit: a63fc18

- use npx for script commands in package.json

  Commit: 4981171

- remove gold-ants-hug changeset file

  Commit: bf685d3

- update build:ci script to use npm exec for execution

  Commit: 8fc3625

- remove gold-ants-hug changeset file

  Commit: bf685d3

- add comprehensive README for Stati CLI, Core, and Create-Stati

  Commit: a63fc18

- update CI build command to include examples/blog

  Commit: 2e8c039

- update CONTRIBUTING and README for clarity and completeness

  Commit: e781bbe

- update build:ci command to ensure proper execution in examples

  Commit: f03ed50

- update build:ci script to install dependencies without global flag

  Commit: fc92a95

- update build:ci command to ensure proper execution in examples

  Commit: f03ed50

- update build:ci script to specify package for npm exec

  Commit: c03d034

- update build:ci script to install dependencies without global flag

  Commit: fc92a95

- streamline CI workflow by consolidating test commands

  Commit: de1a30b

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to use npm exec for execution

  Commit: 8fc3625

- use npx for script commands in package.json

  Commit: 4981171

- streamline CI workflow by consolidating test commands

  Commit: de1a30b

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update CI scripts for linting and type checking in examples

  Commit: a37fdb0

- update CONTRIBUTING and README for clarity and completeness

  Commit: e781bbe

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- update CI build command to include examples/blog

  Commit: 2e8c039

- remove duplicate build step in CI workflow

  Commit: 764c978

- fix build command in CI workflow

  Commit: 5bb2f90

- remove duplicate build step in CI workflow

  Commit: 764c978
