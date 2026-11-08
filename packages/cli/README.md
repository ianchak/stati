# @stati/cli

**The command-line interface for [Stati](https://stati.build), a TypeScript-first static site generator.**

---

## Getting Started

### The Easy Way (Recommended)

If you're new to Stati, start by creating a new site with our scaffolding tool:

```bash
npx create-stati my-site

cd my-site
npm run dev
```

This creates a complete Stati project with the CLI already configured in your `package.json`.

### For Existing Projects

Add Stati CLI to an existing project:

```bash
npm install --save-dev @stati/cli @stati/core
```

Install `@stati/core` too: your `stati.config.ts` imports `defineConfig` from it, and strict package managers such as pnpm do not expose the CLI's own copy to your project.

Then add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview"
  }
}
```

### One-Time Usage

Use npx to run Stati commands without installation:

```bash
npx @stati/cli dev
npx @stati/cli build
npx @stati/cli preview
```

This works for a folder of Markdown and templates without a config file. A `stati.config.*` that imports `@stati/core` needs the package installed in the project; otherwise the config fails to load and Stati falls back to its defaults. Use the package name here: `npx stati` without a local install downloads an unrelated npm package called `stati`.

---

## Commands

| Command | What it does |
| --- | --- |
| `stati dev` | Development server with live reload and incremental rebuilds, at `http://localhost:3000` by default |
| `stati build` | Production build into `dist/` |
| `stati preview` | Serves the built `dist/`, at `http://localhost:4000` by default |
| `stati invalidate [query]` | Marks cache entries to render again on the next build: by `tag:`, `path:`, `glob:` or `age:`, or every entry |

```bash
stati dev --port 8080 --open
stati build --clean
stati invalidate "tag:blog age:1week"
```

Run `stati <command> --help` for its options. The [CLI reference](https://stati.build/cli/commands/) documents every flag, query and exit code.

---

## Learn More

- [Full Documentation](https://stati.build) - Complete guides and tutorials
- [CLI Reference](https://stati.build/cli/commands/) - Detailed command documentation
- [Configuration](https://stati.build/configuration/file/) - All configuration options
- [Core Concepts](https://stati.build/core-concepts/overview/) - How Stati works
- [Examples](https://stati.build/examples/list/) - Real-world projects

---

## Requirements

- **Node.js** ^22.20.0 || >=24
- **A package manager**: npm, pnpm, yarn or bun

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas
- [Documentation](https://stati.build) - Comprehensive guides

---

MIT © [Imre Csige](https://github.com/ianchak)
