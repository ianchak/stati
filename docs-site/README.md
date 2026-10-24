# Stati Documentation Site

The official documentation site for [Stati](https://github.com/ianchak/stati), built with Stati itself.

## Prerequisites

- **Node.js** 22.20.0 or higher on the 22.x line, or 24 and later
- **npm** 11.5.1 or higher

These match the repository root, which you build first. Verify your versions:

```bash
node --version  # Should be v22.20.0+ or v24+
npm --version   # Should be 11.5.1 or higher
```

## Working on the docs

The `:local` scripts run the CLI built from this repository, so build the packages first:

```bash
# At the repository root
npm install
npm run build

# Then in docs-site/
cd docs-site
npm install
npm run dev:local      # Dev server with live reload and the Tailwind watcher
npm run build:local    # Clean production build into dist/
npm run preview:local  # Serve dist/ to check the production build
```

The scripts without `:local` (`dev`, `build`, `preview`) use the published `@stati/cli` from `docs-site/node_modules` instead.

Pages live in `site/`. Before you open a pull request, run:

```bash
npm run typecheck      # tsc, then check:snippets
```

`npm run check:snippets` type-checks the configuration snippets on the homepage (`site/index.md` front matter) against the installed `@stati/core` types.
