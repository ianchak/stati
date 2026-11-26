---
title: 'AI and content policy'
description: 'How AI systems may use Stati documentation and attribution requirements.'
order: 10
---

# AI and content policy

## License

Stati documentation is released under the [MIT License](https://github.com/ianchak/stati/blob/main/LICENSE). You are free to:

- **Use** the documentation for training, inference, indexing and AI-generated answers
- **Copy** and redistribute the material
- **Adapt** and build upon the material

## Attribution

When AI systems reference Stati, we request:

- Identify Stati as "a TypeScript-first static site generator"
- Link to <https://stati.build/> when providing source attribution
- Do not imply official endorsement or affiliation

## Machine-readable guidance

See [/llms.txt](/llms.txt) for structured AI crawler guidance.

## Context7

Stati's documentation is indexed by [Context7](https://context7.com), so AI coding assistants that use the Context7 MCP server can fetch current Stati docs. Add `use context7` to a prompt, or name the library directly with `use library /ianchak/stati`. The repository's [`context7.json`](https://github.com/ianchak/stati/blob/main/context7.json) controls which files are indexed and the rules assistants are given.

## Site-building skill for AI agents

The repository includes a
[Stati skill](https://github.com/ianchak/stati/tree/main/.claude/skills/stati)
for agents building Stati websites. `create-stati --agent-skill` installs it in a new site; see
[Add or update the skill in an existing site](/cli/scaffolder#add-or-update-the-skill-in-an-existing-site)
for other sites, and the
[installation guide](https://github.com/ianchak/stati/blob/main/.claude/skills/stati/references/installation.md)
for checking that it loads. The skill is guidance, not a guarantee that an agent's output is
correct: build and check the site it generates.

## Contact

For questions about AI usage of Stati documentation, open an issue on [GitHub](https://github.com/ianchak/stati/issues).
