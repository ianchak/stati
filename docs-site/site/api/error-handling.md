---
title: 'Error handling'
description: 'Learn how Stati handles errors during build and development.'
order: 3
---

# Error handling

This page lists what stops a build, what a production build works around, and how errors are reported in the terminal and in the dev server's error overlay.

## Error categories

### Configuration errors

**When they occur**: During configuration loading

**Handling**:

- **No config file**: not an error; Stati uses its defaults (site title "My Stati Site", base URL `http://localhost:3000`)
- **Config file fails to load** (syntax error, failing import): the error is printed, followed by "Falling back to default configuration.", and the build **continues with the defaults**. Check the output if your title, base URL or other settings seem to be ignored.
- **Invalid `isg` values**: the build stops with an `Invalid ISG configuration` error that names the field (see [Error names](#error-names))
- **Invalid `images` values**: the build stops with an `Invalid images configuration in <config file>` error that names the option. Unknown keys are rejected too, which catches typos (see [Image errors](#image-errors))
- **Unknown options**: an option Stati does not know, such as Stati 1's `eta`, stops the build with `Invalid configuration in <config file>` and `Unknown option eta.`, naming a similar option when there is one (`Unknown option sitmap. Did you mean sitemap?`)
- **`helpers` that are not functions**: the build stops with, for example, `helpers.formatDate must be a function that templates call as stati.helpers.formatDate() (got number 1).`
- **Invalid `readingTime` or `css` blocks, invalid `seo.defaultAuthor.twitter`, `seo.twitter` or `seo.articles` values, or an invalid `sitemap.news` block**: the build stops with an `Invalid <option> configuration in <config file>` error, such as `Invalid css configuration`, that names the value.
- **An `outDir` that overlaps the site's folders**: the build stops with `Invalid configuration in <config file>`, naming both paths. See [Configuration file](/configuration/file).
- **Other values are not validated** at load time. Unknown keys are rejected at the top level and inside `images`, `css`, `readingTime`, `seo.twitter`, `seo.articles` and `sitemap.news`; an unknown key in another block, such as `search` or `markdown`, is ignored. A wrong type usually surfaces later as a generic error, for example `srcDir: 123` fails with `The "path" argument must be of type string`.

**Example errors**:

```javascript
// Example: Invalid configuration
export default {
  isg: {
    ttlSeconds: 'invalid', // ❌ ISG_INVALID_TTL: ttlSeconds must be a positive integer representing seconds
  },
  images: {
    responsive: { widht: [480, 960] }, // ❌ Unknown option images.responsive.widht. Allowed options: widths, formats, quality, sizes.
  },
};
```

### Content loading errors

**When they occur**: During content discovery and front matter parsing

**Handling**:

- **Unreadable files**: A file that disappears during the build, or an empty file, is skipped with a warning; other read errors, such as missing permissions, stop the build with `Failed to read file <path>`
- **Invalid front matter**: YAML that cannot be read, or front matter that is a list or a single value instead of `key: value` lines, stops the build with `Invalid front matter in <file>` and the line of the problem
- **Invalid ISG front matter**: `tags` that is not a list of strings, a `ttlSeconds` that is not a whole number of 0 or more, or a `maxAgeCapDays` that is not a whole number above 0 stops the build, for example `Invalid tags in front-matter of <file>. Must be an array of strings.`
- **Missing or empty content directory**: The build succeeds with 0 pages ("Found 0 pages"), so check `srcDir` if a build produces nothing
- **Unsupported front matter format**: A front matter block marked with an unknown language (for example `---toml`) fails the build; YAML (the default) and `---json` are supported

**Common scenarios**:

- Individual content files that cannot be read
- Front matter that is not valid YAML, such as an unquoted value that contains a colon
- A misspelled `srcDir`, which silently produces an empty site

### Template rendering errors

**When they occur**: During template processing and HTML generation

**Handling**:

- **Development mode**: Throws `TemplateError` with detailed context (file, line, column) for the template that failed, even when it was included or named as a shell, shown in the error overlay
- **Production mode**: A failing layout or shell is logged as an error and the page is written with the built-in fallback template (see Fallback Mechanisms section); a failing include is logged as an error and replaced by `<!-- Error rendering site/partials/card.eta: message -->`, and the rest of the page renders. Either way the page is not cached: each later build renders it again and logs the error again until the template is fixed (an include that names no template is handled the same way)

**Common scenarios**:

- A template name that matches no file
- Template syntax errors
- Template rendering failures (layouts, shells and included templates)
- Missing template data

**Applies to**: Layouts, the shells they name with `stati.layout()`, and templates rendered by `stati.include()`

```eta
<!-- Template syntax error -->
<% if (stati.collection?.pages { %> <!-- ❌ Missing closing parenthesis -->
  <ul>
    <% stati.collection.pages.forEach(page => { %>
      <li><%= page.frontMatter.title %></li>
    <% }); %>
  </ul>
<% } %>
```

### Include and layout errors

Mistakes in `stati.include()` and `stati.layout()` calls fail the dev build and show the error overlay at the template that made the call. Production builds keep going:

| Case                                                             | Development                                                          | Production                                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A name that resolves to no template                              | Overlay, listing templates with similar paths                        | Error logged; the include renders nothing, or the template renders without the layout |
| Props that are not an object, or a `body` that is not a string   | Error                                                                | Warning; the template renders without them                                            |
| A second `stati.layout()` in one template                        | Error                                                                | Warning; the last call wins                                                           |
| `stati.layout()` after its template finished rendering           | Error                                                                | Warning; the call is ignored                                                          |
| A template that includes or wraps itself without props (a cycle) | Error naming the chain                                               | Error logged; the repeated template is skipped                                        |
| `await` in an included template                                  | Overlay explaining that includes render synchronously                | Error logged; the include renders nothing                                             |
| Eta's own `include()`, `layout()` or `block()`                   | Overlay naming the `stati.include()` or `stati.layout()` call to use | Error logged; the call renders nothing                                                |

Check an optional template with `stati.include.has(name)` instead of including it and catching the error. See [Includes and layouts](/api/templates#includes-and-layouts).

### Unknown template properties

**When they occur**: In the dev server, when a template reads a `stati.*` property that does not exist

**Handling**: Stati throws a `TemplateError` that points to the template file and line, and the error overlay suggests the property you probably meant. Without this check, `<%= stati.paeg.title %>` would fail with an unhelpful `Cannot read properties of undefined`, and `<%= stati.titel %>` would silently render `undefined`.

```eta
<title><%= stati.paeg.title %></title>
<!-- ❌ Unknown property "stati.paeg". Did you mean "stati.page"? -->

<h1><%= stati.title %></h1>
<!-- ❌ Unknown property "stati.title". Did you mean "stati.page.title" or "stati.site.title"? -->

<%= stati.formatDate(stati.page.date) %>
<!-- ❌ Unknown property "stati.formatDate". Did you mean "stati.helpers.formatDate"? -->

<%~ stati.body %>
<!-- ❌ In the page's layout: stati.body is set only in templates rendered by stati.layout() or stati.include(); the page's Markdown is stati.content -->
```

**What is checked**:

- Top-level `stati.*` properties, in every template Stati renders
- Properties of `stati.site`, `stati.nav`, `stati.collection`, `stati.generator` and `stati.helpers`. Optional `site` fields such as `description` are allowed even when they are not set.

**What is not checked**:

- Front matter under `stati.page`, because each page can have different fields. Use optional chaining for fields that some pages leave out: `stati.page.hero?.image`.
- Code that does not run on the page being rendered, such as the branch of an `if` that is not taken

To test whether an optional helper exists, use the `in` operator, which never throws: `<% if ('formatDate' in stati.helpers) { %>`. `stati.props` always exists, so `stati.props?.title ?? 'Default'` works in every template.

The overlay also gives a hint when a template uses `it` or a bare context name such as `page`: Stati templates read their data from `stati`, not Eta's default `it`.

### File system errors

**When they occur**: During output file writing and static asset copying

**Handling**: Immediate failure (critical for build success)

### Image errors

**When they occur**: At the start of a build, before any page renders, and while image jobs finish at the end

**Handling**:

- **`images.responsive` or `images.og` on without `@stati/images`**: the build stops with `images.responsive requires @stati/images. Run: npm i -D @stati/images`. This also applies to the dev server.
- **Incompatible `@stati/images` version**: the build stops with `@stati/images … is not compatible with @stati/core …`. Update both packages.
- **`images.og` with a local or missing `site.baseUrl`**: production builds stop, because `og:image` needs an absolute URL. The dev server doesn't check this.
- **Missing image file**: Stati logs a warning and writes the image as authored. The page is rebuilt once the file exists.
- **An image fails to encode** (a damaged file, for example): the page is rewritten to show the original image without variants, and it is rebuilt on the next build.
- **An Open Graph template Satori can't draw**: in production builds the page is written without a generated image and the error is logged; the dev server shows it in the error overlay.

See [Images troubleshooting](/configuration/images#troubleshooting) for fixes.

### Build hook errors

**When they occur**: During execution of user-defined build hooks

**Handling**: Immediate failure (hooks are user-controlled)

**Common scenarios**:

- Hook function throws an exception
- Async hook rejection

Hooks have no timeout: a hook that never resolves makes the build wait.

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      throw new Error('Hook failed'); // ❌ Will stop the build
    },
  },
});
```

## Error names

Stati's error classes are internal: `@stati/core` does not export them, so check `error.name` instead of using `instanceof`.

| `error.name`                                      | Thrown when                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfigValidationError`                           | An option is unknown or invalid, `helpers` are not functions, or `outDir` overlaps the site's folders                                                                                                                                           |
| `Error` with `cause.name` `ISGConfigurationError` | The `isg` block is invalid. `cause.code` is `ISG_INVALID_TTL`, `ISG_INVALID_MAX_AGE_CAP`, `ISG_INVALID_AGING_RULE`, `ISG_DUPLICATE_AGING_RULE`, `ISG_UNSORTED_AGING_RULES` or `ISG_AGING_RULE_EXCEEDS_CAP`, and `cause.field` names the setting |
| `ISGConfigurationError`                           | A page's `tags`, `ttlSeconds` or `maxAgeCapDays` front matter is invalid                                                                                                                                                                        |
| `FrontMatterError`                                | A page's front matter can't be read                                                                                                                                                                                                             |
| `TemplateError`                                   | A template fails in development; it carries `filePath`, `line` and `column` when known                                                                                                                                                          |
| `DuplicateBundleNameError`                        | Two TypeScript bundles share a `bundleName`                                                                                                                                                                                                     |

## Fallback mechanisms

### Template fallback

When a page has no layout, or its layout or a shell it names fails in a production build, Stati writes the page with a built-in fallback that generates minimal valid HTML. A failing include doesn't use it: the include is replaced by an error comment, or renders nothing when its name matches no template.

<!-- prettier-ignore -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page title</title>
  <meta name="description" content="Page description">
</head>
<body>
  <main>
    <!-- the page's rendered Markdown -->
  </main>
</body>
</html>
```

The title and description come from front matter, HTML-escaped (the title is `Untitled` without one), and the description tag is left out when there is none. A page with no layout at all logs "No layout template found, using fallback".

## Error reporting

### Console output

The CLI marks each message with a colored glyph. The message text itself stays in your terminal's default color; only informational messages are tinted blue.

| Level   | Glyph | ASCII glyph | Glyph color | Stream |
| ------- | ----- | ----------- | ----------- | ------ |
| Error   | `×`   | `ERR`       | Red         | stderr |
| Warning | `!`   | `WARN`      | Amber       | stderr |
| Success | `✓`   | `OK`        | Green       | stdout |
| Info    | none  | none        | Blue text   | stdout |

Color is turned off when `NO_COLOR` is set or stdout is not a terminal (for example when output is piped to a file or CI log), and forced on with `FORCE_COLOR`. Set `STATI_ASCII_ICONS=1` to use the ASCII glyphs in terminals that can't display Unicode.

### Error overlay

During `stati dev`, a failed build is also reported in the browser: Stati serves an error overlay, rendered by `createErrorOverlay`, in place of the page you requested. It shows:

- a heading for the kind of failure (template, build, Markdown or configuration) and a timestamp
- the error message
- the file, line and column when known, and the route you requested
- for template errors, the lines around the failing line, with that line highlighted
- suggestions for fixing it, starting with error-specific hints such as "Did you mean ...?"
- the stack trace, with frames from `node_modules` and Node internals dimmed

The overlay follows your system's light or dark setting. It reloads by itself after the next successful rebuild; see [Browser feedback](/cli/development#browser-feedback).

<figure>

![The Stati error overlay for a template error: a header with the Stati mark, a Watching for changes status and a Refresh button; the heading Template rendering failed; the message Unknown property stati.generatr; the file, line 48 and route; and the template code with line 48 highlighted.](/images/error-overlay-light.webp){.dark:hidden}
![The Stati error overlay in its dark theme: the heading Template rendering failed, the message Unknown property stati.generatr, the file, line and route, and the template code with the failing line highlighted.](/images/error-overlay-dark.webp){.hidden .dark:block}

<figcaption>A misspelled <code>stati.generator</code> in a footer partial, as the overlay reports it.</figcaption>
</figure>

### Error context

Error messages include relevant context:

```text
× Error rendering site/blog/layout.eta for /blog/my-post: Cannot read properties of undefined (reading 'title')
```

### Build statistics

Build statistics are tracked and returned from the build function:

```typescript
interface BuildStats {
  /** Total number of pages processed */
  totalPages: number;
  /** Number of static assets copied */
  assetsCount: number;
  /** Total build time in milliseconds */
  buildTimeMs: number;
  /** Total size of output directory in bytes */
  outputSizeBytes: number;
  /** Number of cache hits (if caching enabled) */
  cacheHits?: number;
  /** Number of cache misses (if caching enabled) */
  cacheMisses?: number;
}
```

## Debugging approaches

To check the configuration, run `stati build` and read the first lines. A config that fails to load prints `Error loading config from ...` followed by "Falling back to default configuration."

## Best practices

### 1. Validate configuration

`defineConfig()` gives your editor and `tsc` the config's types. At load time Stati checks the option names, `helpers`, `outDir`, and the `isg`, `images`, `css`, `readingTime`, `seo.twitter`, `seo.articles`, `seo.defaultAuthor.twitter` and `sitemap.news` settings, so the type check is your safeguard for everything else.

### 2. Use consistent front matter

Use one date field across the site. Stati reads the page's publication date (used for sorting collections, navigation, ISG aging and RSS) from the first valid value among `publishedAt`, `published`, `date` and `createdAt`, quoted or unquoted. An invalid value is skipped with a warning, so a typo silently moves the page to the end of date-sorted lists.

## Recovery strategies

### Partial build success

In production builds, a page whose layout fails is still written, using the fallback template, and the build continues. Check the build output for errors before deploying. A layout, shell or include that failed logs a message starting with `Error rendering`; an include whose name matches no template logs `stati.include('…'): no template at …`, and the page is written without it. A page that logged an error like this is rendered again, and the error logged again, on every build until you fix it, so a cached build never hides it. Configuration and front matter errors, hook errors and file system errors still stop the build.

### Build interruption recovery

If a build is interrupted:

- **Cache**: The cache manifest is saved only at the end of a build, so an interrupted build's progress is not recorded; the next build re-renders those pages
- **Lock file**: `stati build` holds a lock file at `.stati/.build-lock` while it runs. A lock left by a process that is no longer running is removed automatically; `--force` or `--clean` take the lock over even while another build holds it
- **Clean state**: When in doubt, run `stati build --clean`

### Cache-related issues

`stati build --clean` deletes the output directory and the cache, then builds everything. `stati build --force` renders every page and keeps both.
