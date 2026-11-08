---
title: 'Dev server'
description: 'Run stati dev: what it rebuilds on each change, live reload, the Tailwind CSS watcher and the error overlay.'
order: 3
seo:
  title: 'Stati dev server'
---

# Dev server

## Start the server

```bash
stati dev
```

The options are listed under [`stati dev`](/cli/commands#stati-dev). `--port`, `--host` and `--open` override `dev.port`, `dev.host` and `dev.open` in your config.

## What happens on startup

When you start the server Stati:

1. Invalidates the incremental cache by calling `invalidate()` with no query, so every page renders again.
2. Runs a full build with the current configuration so the `dist/` directory is ready to serve.
3. Boots an HTTP server (default `http://localhost:3000`) and a WebSocket endpoint at `/__ws` for live reload events. When `site.baseUrl` has a path, the site is served under it (`http://localhost:3000/docs/`): `/` redirects there and other URLs outside it are a 404, while `/__ws` stays at the server's root. See [Deploying to a subfolder](/advanced/deploying-to-a-subfolder).
4. Begins watching the resolved content directory (default `site`) and static assets directory (default `public`).

With `--open`, Stati opens the site in your default browser.

## Live reload and incremental builds

When a file is added, changed or deleted, Stati:

- Rebuilds incrementally. Changes made while a rebuild runs are rebuilt together when it finishes.
- Logs each changed file, for example `▸ site/blog/post.md rebuilt` followed by `Done in 95ms`.
- Reloads connected browsers once the rebuild succeeds. A failed rebuild reloads nothing; see [Browser feedback](#browser-feedback).

## Template changes and cache invalidation

Each page's cache entry records the templates it rendered and the template names it looked up, so a template change rebuilds only the pages it affects:

- **A changed template** rebuilds the pages that rendered it. A template no page renders rebuilds nothing, and the log says `No page uses it`.
- **A new template** rebuilds the pages whose recorded template names now find it, such as the pages of a section that gains its own `partials/header.eta`, or pages whose `stati.include.has()` check now finds a file.
- **A deleted template** rebuilds the pages that rendered it, and the pages whose template names now find a different file.

Markdown changes rebuild the edited page, plus the pages whose output depends on it: pages that read its [collection](/core-concepts/collections) when a field in [`collections.summaryFields`](/core-concepts/collections#what-rebuilds-a-listing) (by default the title, description, tags and draft flag), its URL or its date changed, and pages that render the navigation when the edit changed it (such as a `title`, `order` or date, or a page added or removed). Deleting a page removes its HTML from the output directory.

## Static assets

A change in `public/` copies the static files into `dist/` again, and the page reloads. Images next to your Markdown files are watched too: changing one rebuilds the pages that show it.

Responsive images and Open Graph cards take time to encode, so the dev server skips them by default and shows images with their size and lazy loading only. Set `images.dev: 'full'` to generate them while you work. See [Images](/configuration/images#dev-server).

## Tailwind CSS integration

With `--tailwind-input` and `--tailwind-output`, `stati dev` starts a Tailwind CSS watcher alongside the dev server:

```bash
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

**How it works:**

- Stati spawns a Tailwind CLI process in watch mode using the locally installed `tailwindcss` executable from `node_modules/.bin/`. Tailwind CSS 4 and 3 both work.
- Pages link the output under its path in `dist/`, here `/styles.css`: Stati adds `<link rel="stylesheet" href="/styles.css">` before `</head>` unless the page links it already or `css.autoInject` is `false`. An output outside `dist/` is still written, but Stati can't link it, and the dev server says so when it starts.
- Only Tailwind's errors are shown. `--tailwind-verbose` shows all of its output, including its "done in" times.
- The watcher runs for as long as the dev server does, including when the dev server runs in a background or CI shell without a terminal.
- When you stop the dev server (`Ctrl+C`), the Tailwind watcher is automatically stopped as well. It also exits when the dev server process is killed, so no watcher is left running.
- If the watcher stops on its own, for example because Tailwind CSS 4 found an error in the stylesheet at startup, the dev server says so. Fix the error and restart `stati dev`.

**Requirements:**

- You must have the `tailwindcss` command installed locally in your project. Tailwind CSS 4, the version the scaffolder installs, ships it in `@tailwindcss/cli`: `npm install -D tailwindcss @tailwindcss/cli`. With Tailwind CSS 3, `npm install -D tailwindcss@3` includes it.
- If Tailwind CSS or the input file is missing, `stati dev` prints an error and exits.

`stati build` takes the same two flags and runs Tailwind once after the last page renders, writing a stylesheet named after its content. See [CSS](/configuration/css).

## Browser feedback

- When a build error occurs, Stati serves an error overlay in place of the page you requested. See [Error overlay](/api/error-handling#error-overlay) for what it shows.
- A template that reads a `stati.*` property that does not exist, such as `stati.paeg` or a misspelled helper, fails with a "Did you mean ...?" suggestion instead of rendering `undefined`. See [Unknown template properties](/api/error-handling#unknown-template-properties).
- The overlay stays connected to the dev server. Fix the error and save, and the page reloads on the next successful rebuild. The header shows whether the connection is live, and **Refresh** (or `Ctrl+R` / `Cmd+R`) reloads by hand.

## Stopping the server

Press `Ctrl+C` (or send `SIGINT`/`SIGTERM`) to stop the server and its watchers.

## Troubleshooting

- **Changes not showing up** – Ensure the file is inside `site` or `public` (or your TypeScript `srcDir`, which esbuild watches). Files whose names start with a dot are not watched, nor are other files, including `stati.config.*`: restart the server after editing the config.
- **Cache feels stale** – Restart `stati dev`: startup clears the cache and rebuilds every page. Don't run `stati build --clean` while the dev server runs, as it deletes the output and the cache the server is using.
- **Port already in use** – Stati stops with "Port 3000 is already in use on localhost" before it builds. Stop the other process, or pick another port with `--port` or `dev.port`.
