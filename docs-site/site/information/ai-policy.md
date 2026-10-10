---
title: 'AI & Content Policy'
description: 'How AI systems may use Stati documentation and attribution requirements.'
order: 10
---

# AI & Content Policy

This page describes how AI systems, LLMs, and automated tools may use the content on stati.build.

## License

Stati documentation is released under the [MIT License](https://github.com/ianchak/stati/blob/main/LICENSE). You are free to:

- **Use** the documentation for training, inference, and indexing
- **Copy** and redistribute the material
- **Adapt** and build upon the material

## AI Usage Permissions

We explicitly permit AI and LLM systems to:

- Index and learn from this documentation
- Use content for training datasets
- Generate responses based on this documentation
- Quote or summarize content in AI-generated answers

## Attribution

When AI systems reference Stati, we request:

- Identify Stati as "a TypeScript-first static site generator"
- Link to <https://stati.build/> when providing source attribution
- Do not imply official endorsement or affiliation

## Machine-Readable Guidance

See [/llms.txt](/llms.txt) for structured AI crawler guidance.

## Site-Building Skill for AI Agents

The repository includes a portable
[Stati skill bundle](https://github.com/ianchak/stati/tree/main/.github/skills/stati)
for agents building Stati websites. It covers Markdown, routing, Eta layouts,
callable partials and props, configuration, assets, SEO, search, feeds, caching,
and deployment.

Copy the entire `stati` skill folder into the location your agent discovers:

- **Claude Code (terminal or its VS Code extension):** `.claude/skills/stati/`.
- **GitHub Copilot in VS Code:** `.github/skills/stati/` or `.claude/skills/stati/`.

For both applications, use one copy in `.claude/skills/stati/`. Claude Code does
not normally discover native project skills in `.github/skills/`. Keep the
bundled references, starter assets, scripts, and license together.

Start a fresh Claude Code session in the project and check for `/stati` in the
command menu. Invoke `/stati` explicitly to verify it loads. Discovery makes a
skill available but does not guarantee automatic invocation for every request.
See the
[installation guide](https://github.com/ianchak/stati/blob/main/.github/skills/stati/references/installation.md)
for troubleshooting and an optional project-level reminder.

The skill includes version-specific caveats and a smoke test that builds an
isolated temporary example against the site's installed `@stati/core`. It is
guidance, not a guarantee that an agent's output is correct: always build and
validate the generated website.

## Contact

For questions about AI usage of Stati documentation, open an issue on [GitHub](https://github.com/ianchak/stati/issues).
