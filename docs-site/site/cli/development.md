---
title: 'Development'
description: 'Learn how to use Stati development server for hot reloading, debugging, and efficient development workflows.'
order: 3
---

# Development Server

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

# Load configuration from a different directory
stati dev --config ./stati.staging.js
```

The `--port`, `--host`, `--open`, and `--config` flags map directly to the options accepted by `createDevServer` in `@stati/core`.

## What happens on startup

When you start the server Stati:

1. Clears the incremental cache by calling `invalidate()` with no query.
2. Runs a full build with the current configuration so the `dist/` directory is ready to serve.
3. Boots an HTTP server (default `http://localhost:3000`) and a WebSocket endpoint at `/__ws` for live reload events.
4. Begins watching the resolved content directory (default `site/`) and static assets directory (default `public/`).

If `--open` is set, Stati attempts to launch your default browser using the `open` package.

## Live reload and incremental builds

File watching is handled by `chokidar` with listeners for file additions, edits, and deletions. Whenever a change is detected Stati:

- Starts an incremental rebuild unless another rebuild is already in progress.
- Logs which file triggered the rebuild, for example `⚡ site/blog/post.md rebuilt in 95ms`.
- Broadcasts a `reload` message over the WebSocket connection so connected browsers refresh automatically.

## Template changes and cache invalidation

Templates (`*.eta`) and partials get special handling:

- Stati inspects the cache manifest to find pages that depend on the changed template.
- The affected entries are removed from the manifest so the next build renders them again.
- If no dependency matches are found, Stati falls back to a full rebuild to keep output consistent.

This logic lives in `handleTemplateChange` inside `packages/core/src/core/dev.ts`.

## Static assets

Static files inside `public/` are part of the watch list. When assets change they are recopied into `dist/` during the rebuild, so image and favicon updates appear on the next refresh.

## Browser feedback

- Successful rebuilds simply reload the page.
- When a build error occurs, Stati renders an HTML overlay describing the failure (using `createErrorOverlay`).
- Closing the overlay or fixing the error clears the message on the next successful rebuild.

## Stopping the server

Press `Ctrl+C` (or send `SIGINT`/`SIGTERM`) to stop the server. Stati closes the WebSocket server, file watcher, and HTTP listener before exiting.

## Troubleshooting

- **Repeated failures** – Check the browser overlay for the full stack trace, then inspect the terminal output logged by the CLI.
- **Changes not showing up** – Ensure the file is inside `site/` or `public/`. Files outside those directories are not watched.
- **Cache feels stale** – Run `stati build --clean` in another terminal to rebuild everything and refresh the manifest.
- **Port already in use** – Start the server on a different port with `stati dev --port 4001`.
