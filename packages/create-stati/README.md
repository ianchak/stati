# create-stati

**Creates a new [Stati](https://stati.build) site from a template, with your choice of styling.**

---

## Quick Start

Create a new Stati site with a single command:

```bash
npx create-stati
```

The interactive wizard will guide you through:

1. **Project name** - What to call your site
2. **Template** - Starting point: blank, a complete blog, a complete docs site, or a complete news site
3. **CSS solution** - Plain CSS, Sass, or Tailwind
4. **TypeScript** - On by default; answer no for a JavaScript project
5. **Image tools** - Off by default; yes adds `@stati/images` for responsive images and link preview cards
6. **Agent skill** - Optional Stati skill for AI coding assistants
7. **Git initialization** - Optional repository setup
8. **Dependency installation** - Install now or later
9. **Package manager** - Only when several are detected

---

## Non-Interactive Mode

Skip the prompts and create a site with specific options:

```bash
npx create-stati my-site --template=blank --styling=tailwind --no-git --no-install
```

When the project name, `--template` and `--styling` are all given, the TypeScript, image tools and agent skill prompts are skipped: the project uses TypeScript (unless `--no-typescript`) and gets neither image tools (unless `--images`) nor an agent skill (unless `--agent-skill`). The Git and install prompts still appear unless you pass `--no-git` and `--no-install`; there are no `--git` or `--install` flags.

**Available flags:**

- `--template <name>` - Template to use (`blank` | `blog` | `docs` | `news`)
- `--styling <type>` - CSS solution (`css` | `sass` | `tailwind`)
- `--typescript`, `--ts` - Use TypeScript (default)
- `--no-typescript`, `--no-ts` - Use JavaScript instead of TypeScript
- `--images` - Add image tools: responsive AVIF/WebP images and link preview cards (`@stati/images`)
- `--no-images` - Skip image tools (default)
- `--no-git` - Skip git initialization (default: initializes Git)
- `--no-install` - Skip dependency installation (default: installs dependencies)
- `--package-manager <pm>` - Package manager to use (`npm` | `yarn` | `pnpm` | `bun`)
- `--agent-skill [target]` - Install the Stati agent skill (`claude` | `agents`, default: `claude`)
- `--no-agent-skill` - Skip agent skill installation
- `--help`, `-h` - Show help message

**Examples:**

```bash
# JavaScript instead of TypeScript, with Tailwind
npx create-stati my-app --no-typescript --styling=tailwind

# Sass, installed with pnpm
npx create-stati my-site --styling=sass --package-manager=pnpm

# Install the Stati agent skill for Claude Code / Copilot
npx create-stati my-site --agent-skill
```

> **Note:** Without `--package-manager`, the scaffolder uses the one package manager it finds, asks when it finds several, and falls back to npm.

---

## Templates

- **blank** - A homepage, a layout and one stylesheet
- **blog** - Posts, tag pages, a yearly archive, related posts, an RSS feed, a sitemap and SEO metadata
- **docs** - A sidebar built from your folders, search, an on-page table of contents and syntax highlighting
- **news** - Sections, a ranked front page, author pages, feeds, search and a Google News sitemap

Projects use TypeScript (`stati.config.ts`, `tsconfig.json`, `src/main.ts` and a `typecheck` script) unless you pass `--no-typescript`. The blank template gets a fresh config; the others keep their own `stati.config.js` (`stati.config.ts` with TypeScript). Each config has the placeholder `site.baseUrl` `https://example.com`: set your real address before you deploy.

## Styling

- **css** - `public/styles.css`, no build step
- **sass** - `src/styles.scss`, compiled into `public/styles.css` by the `build:css` and `watch:css` scripts
- **tailwind** - Tailwind CSS 4 from `src/styles.css`, built by `stati dev` and `stati build` with `--tailwind-input` and `--tailwind-output`

## Agent skill

`--agent-skill`, or the prompt, installs the [Stati agent skill](https://github.com/ianchak/stati/tree/main/.claude/skills/stati) with the `skills` CLI: `claude` puts it in `.claude/skills/stati/`, `agents` in `.agents/skills/stati/`. Update it with `npx skills@1 update stati -p`.

## After creation

```bash
cd my-site
npm install   # only if you used --no-install
npm run dev   # http://localhost:3000
```

The [scaffolder guide](https://stati.build/cli/scaffolder/) covers every option, template and generated file.

---

## Requirements

- **Node.js** ^22.20.0 || >=24
- **A package manager**: npm, pnpm, yarn or bun

---

## Learn More

- [Full Documentation](https://stati.build) - Complete guides and tutorials
- [CLI Commands](https://stati.build/cli/commands) - All available commands
- [Core Concepts](https://stati.build/core-concepts/overview) - How Stati works
- [Examples](https://stati.build/examples/list) - Real-world projects and recipes

---

## Support & Community

- [GitHub Issues](https://github.com/ianchak/stati/issues) - Report bugs or request features
- [Discussions](https://github.com/ianchak/stati/discussions) - Ask questions, share ideas
- [Documentation](https://stati.build) - Comprehensive guides

---

## License

MIT © [Imre Csige](https://github.com/ianchak)
