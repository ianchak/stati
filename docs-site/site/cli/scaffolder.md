---
title: 'Scaffolder'
description: 'Interactive scaffolding tool to quickly set up new Stati projects.'
order: 2
seo:
  title: 'Scaffolder (create-stati)'
---

# Scaffolder

The `create-stati` package provides an interactive scaffolding tool to quickly set up new Stati projects with styling options.

## Quick start

```bash
# Interactive setup
npm create stati my-site

# Non-interactive with options
npm create stati my-site --template=blank --styling=tailwind

# JavaScript instead of TypeScript
npm create stati my-site --no-typescript
```

Running the scaffolder will:

- Create a new project directory
- Copy the blank starter template files into that directory
- Update `package.json` with your project name and Stati metadata
- Set up optional styling scripts based on the chosen styling option
- Optionally install the Stati agent skill for AI coding assistants
- Initialize a Git repository by default (use `--no-git` to skip)
- Install dependencies by default (use `--no-install` to skip)

> **Note:** You can skip automatic dependency installation with `--no-install` and install them manually later.
>
> **Non-Interactive Mode:** When all required options are provided via CLI flags, dependencies are installed automatically by default using `npm`. Use `--package-manager` to specify a different package manager (yarn, pnpm, or bun).

## Interactive setup

The scaffolder will prompt you for:

1. **Project name** - Name for your new Stati site
2. **Styling solution** - Choose between CSS, Sass, or Tailwind CSS
3. **TypeScript** - On by default; answer no for a JavaScript project
4. **Agent skill** - Where to install the Stati agent skill, if at all
5. **Git initialization** - Whether to initialize a Git repository
6. **Dependency installation** - Whether to install dependencies automatically
7. **Package manager** - Which package manager to use (if multiple are detected)

## Command line options

```bash
npx create-stati <project-name> [options]

Options:
  --template <name>        Template to use (currently: blank)
  --styling <type>         CSS solution (css|sass|tailwind)
  --typescript, --ts       Use TypeScript (default)
  --no-typescript, --no-ts Use JavaScript instead of TypeScript
  --no-git                 Skip git initialization (default: initializes Git)
  --no-install             Skip dependency installation (default: installs dependencies)
  --package-manager <pm>   Package manager to use (npm|yarn|pnpm|bun)
  --agent-skill [target]   Install the Stati agent skill (claude|github|agents, default: claude)
  --no-agent-skill         Skip agent skill installation
  --help, -h               Show help message
```

## Agent skill

The scaffolder can copy the Stati agent skill into your project. The skill teaches AI coding assistants Stati's conventions for content, Eta templates, partials, configuration, and deployment.

| Target             | Installed to            | Discovered by                          |
| ------------------ | ----------------------- | -------------------------------------- |
| `claude` (default) | `.claude/skills/stati/` | Claude Code, GitHub Copilot in VS Code |
| `github`           | `.github/skills/stati/` | GitHub Copilot                         |
| `agents`           | `.agents/skills/stati/` | Tools using the `.agents` convention   |

In interactive mode you choose a target (or skip) when prompted. In non-interactive mode the skill is only installed when `--agent-skill` is passed. In Claude Code, invoke it with `/stati`.

```bash
npm create stati my-site --agent-skill
npm create stati my-site --agent-skill=github
```

## Project templates

### Blank template

Currently, Stati provides one template:

- **blank** - Minimal starter with basic structure and example content

**What's included:**

- Basic site structure (`site/`, `public/`)
- A homepage that walks through the project, and a layout with header, navigation and footer
- One stylesheet with light and dark themes; colors and fonts are CSS custom properties
- Configuration file with sensible defaults
- Package.json with development scripts

## Styling solutions

Choose your preferred styling approach:

### CSS (default)

- One CSS file in `public/styles.css`, themed by custom properties at the top
- No preprocessing or build step required

### Sass

- Creates `src/styles.scss` from the starter stylesheet, with `$primary-color`, `$font-stack` and a breakpoint as Sass variables
- SCSS support with build scripts
- Automatic compilation during development and build
- Scripts added: `build:css`, `watch:css`
- Modified scripts: `build` and `dev` to include CSS compilation

### Tailwind CSS

- Generates `tailwind.config.js` with content paths for `site/**/*.{md,eta,html}` and `.stati/tailwind-classes.html`
- Creates source stylesheet at `src/styles.css` compiled directly to `dist/styles.css`; it rebuilds the starter's look with `@apply`, Tailwind's slate and blue palette and `dark:` variants
- Scripts added: `build:css`
- Modified scripts:
  - `dev`: Uses Stati's built-in Tailwind integration (single process)
  - `build`: Runs Stati build, then CSS compilation

## Post-creation setup

After creating your site:

```bash
cd my-site
npm install  # Skip if you installed dependencies during setup
npm run dev
```

## Package scripts

All created projects include these base scripts:

```json
{
  "scripts": {
    "dev": "stati dev",
    "build": "stati build",
    "preview": "stati preview",
    "clean:dist": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\"",
    "clean:cache": "node -e \"require('node:fs').rmSync('.stati',{recursive:true,force:true})\"",
    "clean": "npm run clean:dist && npm run clean:cache"
  }
}
```

> **Note:** When using Sass or Tailwind CSS, the `build` and `dev` scripts are automatically modified to include CSS compilation steps. See the [Styling Solutions](#styling-solutions) section for details.

## Generated project structure

### Plain CSS (default)

```text
my-site/
├── site/
│   ├── index.md          # Homepage content
│   └── layout.eta        # Main layout template
├── public/
│   ├── styles.css        # Stylesheet
│   └── favicon.svg       # Site icon
├── src/
│   └── main.ts           # Client TypeScript entry point
├── stati.config.ts       # Stati configuration
├── tsconfig.json         # TypeScript compiler configuration
├── package.json          # Node.js project file
└── README.md            # Getting started guide
```

### With Sass

```text
my-site/
├── site/
│   └── ...
├── src/
│   └── styles.scss       # Sass source file
├── public/
│   └── favicon.svg       # Site icon
├── stati.config.ts
└── package.json          # Includes sass scripts
```

### With Tailwind CSS

```text
my-site/
├── site/
│   └── ...
├── src/
│   └── styles.css        # Tailwind source file
├── public/
│   └── favicon.svg       # Site icon
├── tailwind.config.js    # Tailwind configuration
├── stati.config.ts
└── package.json          # Includes Tailwind scripts
```

The `typecheck` script is added to `package.json` for validating your TypeScript code.

### With JavaScript

With `--no-typescript` (or answering no to the TypeScript prompt), the project has no `src/main.ts`, `tsconfig.json` or `typecheck` script, and the config is plain JavaScript:

```text
my-site/
├── site/
│   └── ...
├── stati.config.js       # Stati configuration
└── ...
```

### With the agent skill

When using `--agent-skill` (default target `claude`), the full skill bundle is copied:

```text
my-site/
├── .claude/
│   └── skills/
│       └── stati/
│           ├── SKILL.md      # Skill entry point
│           ├── references/   # Task-specific guidance
│           ├── assets/       # Starter files and examples
│           └── scripts/      # Helper scripts
└── ...
```

## Requirements

- Node.js 22+
- npm, yarn, pnpm, or bun

## Next steps

- Start the development server: `npm run dev`
- Add content to the `site/` directory
- Customize the layout in `site/layout.eta`
- Configure your site in `stati.config.ts` (or `stati.config.js` for JavaScript projects)
- Learn more about [TypeScript support](/configuration/typescript)
