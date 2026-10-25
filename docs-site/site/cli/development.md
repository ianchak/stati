---
title: 'Dev server'
description: 'Learn how to use Stati development server for live reload, debugging, and efficient development workflows.'
order: 3
seo:
  title: 'Stati dev server'
---

# Dev server

Stati's development server pairs incremental builds with live reload so you can preview content changes instantly.

## Start the server

Use the CLI to launch the dev server:

```bash
# Default
stati dev

# Custom port and host
stati dev --port 4000 --host 0.0.0.0

# Automatically open your browser
stati dev --open
```

The `--port`, `--host` and `--open` flags map directly to the options accepted by `createDevServer` in `@stati/core` and override `dev.port`, `dev.host` and `dev.open` from your config.

## What happens on startup

When you start the server Stati:

1. Clears the incremental cache by calling `invalidate()` with no query.
2. Runs a full build with the current configuration so the `dist/` directory is ready to serve.
3. Boots an HTTP server (default `http://localhost:3000`) and a WebSocket endpoint at `/__ws` for live reload events.
4. Begins watching the resolved content directory (default `site`) and static assets directory (default `public`).

If `--open` is set, Stati attempts to launch your default browser using the `open` package.

## Live reload and incremental builds

File watching is handled by `chokidar` with listeners for file additions, edits, and deletions. Whenever a change is detected Stati:

- Starts an incremental rebuild. Changes made while a rebuild runs are queued and rebuilt together when it finishes.
- Logs which file triggered the rebuild, for example `▸ site/blog/post.md rebuilt` followed by `Done in 95ms`.
- Broadcasts a `reload` message over the WebSocket connection so connected browsers refresh automatically.

## Template changes and cache invalidation

Each page's cache entry records the templates it rendered and the template names it looked up, so a template change rebuilds only the pages it affects:

- **A changed template** rebuilds the pages that rendered it. A template no page renders rebuilds nothing, and the log says `No page uses it`.
- **A new template** rebuilds the pages whose recorded template names now find it, such as the pages of a section that gains its own `partials/header.eta`, or pages whose `stati.include.has()` check now finds a file.
- **A deleted template** rebuilds the pages that rendered it, and the pages whose template names now find a different file.

Pages whose cache entries predate this record are rebuilt in full once.

Markdown changes rebuild the edited page, plus the pages whose output depends on it: pages that read its [collection](/core-concepts/collections) when its title, description, tags or date changed, and pages that render the navigation when the edit changed it (a `title` or `order`, or a page added or removed). Deleting a page removes its HTML from the output directory.

Template changes are handled by `markTemplateChanges` in `packages/core/src/core/dev.ts`; the pages a Markdown change affects are found by the ISG checks in `packages/core/src/core/isg/builder.ts`.

## Static assets

Static files inside `public` are part of the watch list. When assets change they are recopied into `dist/` during the rebuild, so image and favicon updates appear on the next refresh. Images next to your Markdown files are watched too: changing one rebuilds the pages that show it.

Responsive images and Open Graph cards take time to encode, so the dev server skips them by default and shows images with their size and lazy loading only. Set `images.dev: 'full'` to generate them while you work. See [Images](/configuration/images#dev-server).

## Tailwind CSS integration

Stati includes built-in Tailwind CSS support for the development server. When you provide `--tailwind-input` and `--tailwind-output` flags, Stati automatically starts a Tailwind CSS watcher alongside the dev server:

```bash
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

**How it works:**

- Stati spawns a Tailwind CLI process in watch mode using the locally installed `tailwindcss` executable from `node_modules/.bin/`. Tailwind CSS 4 and 3 both work.
- Pages link the output under its path in `dist/`, here `/styles.css`: Stati adds `<link rel="stylesheet" href="/styles.css">` before `</head>` unless the page links it already. An output outside `dist/` is still written, but Stati can't link it, and the dev server says so when it starts.
- By default, only errors are shown (quiet mode) to keep the console clean.
- Use `--tailwind-verbose` to see all Tailwind output including "done in Xms" messages.
- The watcher runs for as long as the dev server does, including when the dev server runs in a background or CI shell without a terminal.
- When you stop the dev server (`Ctrl+C`), the Tailwind watcher is automatically stopped as well. It also exits when the dev server process is killed, so no watcher is left running.
- If the watcher stops on its own, for example because Tailwind CSS 4 found an error in the stylesheet at startup, the dev server says so. Fix the error and restart `stati dev`.

**Requirements:**

- You must have the `tailwindcss` command installed locally in your project. Tailwind CSS 4, the version the scaffolder installs, ships it in `@tailwindcss/cli`: `npm install -D tailwindcss @tailwindcss/cli`. With Tailwind CSS 3, `npm install -D tailwindcss@3` includes it.
- Stati will check for the installation and show an error if it's not found.

`stati build` takes the same two flags and runs Tailwind once after the last page renders, writing a stylesheet named after its content. See [CSS](/configuration/css).

**Example with verbose output:**

```bash
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css --tailwind-verbose
```

## Browser feedback

- Successful rebuilds simply reload the page.
- When a build error occurs, Stati serves an error overlay in place of the page you requested. See [Error overlay](/api/error-handling#error-overlay) for what it shows.
- A template that reads a `stati.*` property that does not exist, such as `stati.paeg` or a misspelled helper, fails with a "Did you mean ...?" suggestion instead of rendering `undefined`. See [Unknown template properties](/api/error-handling#unknown-template-properties).
- The overlay stays connected to the dev server. Fix the error and save, and the page reloads on the next successful rebuild. The header shows whether the connection is live, and **Refresh** (or `Ctrl+R` / `Cmd+R`) reloads by hand.

## Stopping the server

Press `Ctrl+C` (or send `SIGINT`/`SIGTERM`) to stop the server. Stati closes the WebSocket server, file watcher, and HTTP listener before exiting.

## Troubleshooting

- **Repeated failures** – Check the browser overlay for the full stack trace, then inspect the terminal output logged by the CLI.
- **Changes not showing up** – Ensure the file is inside `site` or `public` (or your TypeScript `srcDir`, which esbuild watches). Other files, including `stati.config.*`, are not watched: restart the server after editing the config.
- **Cache feels stale** – Restart `stati dev`: startup clears the cache and rebuilds every page. Don't run `stati build --clean` while the dev server runs, as it deletes the output and the cache the server is using.
- **Port already in use** – Start the server on a different port with `stati dev --port 4001`.
