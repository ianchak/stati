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

The `--port`, `--host` and `--open` flags map directly to the options accepted by `createDevServer` in `@stati/core` and override `dev.port`, `dev.host` and `dev.open` from your config. `--config` is accepted too, but the dev server loads `stati.config.*` from the current directory, so start it from the project root (see [Config file location](/cli/commands#config-file-location)).

## What happens on startup

When you start the server Stati:

1. Clears the incremental cache by calling `invalidate()` with no query.
2. Runs a full build with the current configuration so the `dist/` directory is ready to serve.
3. Boots an HTTP server (default `http://localhost:3000`) and a WebSocket endpoint at `/__ws` for live reload events.
4. Begins watching the resolved content directory (default `site`) and static assets directory (default `public`).

If `--open` is set, Stati attempts to launch your default browser using the `open` package.

## Live reload and incremental builds

File watching is handled by `chokidar` with listeners for file additions, edits, and deletions. Whenever a change is detected Stati:

- Starts an incremental rebuild unless another rebuild is already in progress.
- Logs which file triggered the rebuild, for example `▸ site/blog/post.md rebuilt` followed by `Done in 95ms`.
- Broadcasts a `reload` message over the WebSocket connection so connected browsers refresh automatically.

## Template changes and cache invalidation

Templates (`*.eta`) and partials get special handling:

- Stati inspects the cache manifest to find pages that depend on the changed template.
- The affected entries are marked stale so the rebuild renders them again.
- If no dependency matches are found, Stati falls back to a full rebuild to keep output consistent.

Markdown changes rebuild the edited page. When the edit changes the navigation (a `title` or `order`, or a page added or removed), Stati rebuilds every page so menus stay in sync.

This logic lives in `handleTemplateChange` inside `packages/core/src/core/dev.ts`.

## Static assets

Static files inside `public` are part of the watch list. When assets change they are recopied into `dist/` during the rebuild, so image and favicon updates appear on the next refresh.

## Tailwind CSS integration

Stati includes built-in Tailwind CSS support for the development server. When you provide `--tailwind-input` and `--tailwind-output` flags, Stati automatically starts a Tailwind CSS watcher alongside the dev server:

```bash
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css
```

**How it works:**

- Stati spawns a Tailwind CLI process in watch mode using the locally installed `tailwindcss` executable from `node_modules/.bin/`.
- By default, only errors are shown (quiet mode) to keep the console clean.
- Use `--tailwind-verbose` to see all Tailwind output including "done in Xms" messages.
- When you stop the dev server (`Ctrl+C`), the Tailwind watcher is automatically stopped as well.

**Requirements:**

- You must have `tailwindcss` installed locally in your project (`npm install -D tailwindcss`).
- Stati will check for the installation and show an error if it's not found.

**Example with verbose output:**

```bash
stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css --tailwind-verbose
```

## Browser feedback

- Successful rebuilds simply reload the page.
- When a build error occurs, Stati serves an error overlay in place of the page you requested. See [Error overlay](/api/error-handling#error-overlay) for what it shows.
- A template that reads a `stati.*` property that does not exist, such as `stati.paeg` or a misspelled filter, fails with a "Did you mean ...?" suggestion instead of rendering `undefined`. See [Unknown template properties](/api/error-handling#unknown-template-properties).
- The overlay stays connected to the dev server. Fix the error and save, and the page reloads on the next successful rebuild. The header shows whether the connection is live, and **Refresh** (or `Ctrl+R` / `Cmd+R`) reloads by hand.

## Stopping the server

Press `Ctrl+C` (or send `SIGINT`/`SIGTERM`) to stop the server. Stati closes the WebSocket server, file watcher, and HTTP listener before exiting.

## Troubleshooting

- **Repeated failures** – Check the browser overlay for the full stack trace, then inspect the terminal output logged by the CLI.
- **Changes not showing up** – Ensure the file is inside `site` or `public` (or your TypeScript `srcDir`, which esbuild watches). Other files, including `stati.config.*`, are not watched: restart the server after editing the config.
- **Cache feels stale** – Run `stati build --clean` in another terminal to rebuild everything and refresh the manifest.
- **Port already in use** – Start the server on a different port with `stati dev --port 4001`.
