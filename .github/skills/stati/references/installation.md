# Installation, discovery, and invocation

The Agent Skills file format is portable. **Skill directory discovery is
application-specific**, not determined by the model name. Claude Code and a
Claude model selected in GitHub Copilot are different applications.

## Choose the correct directory

This repository distributes its bundle in `.github/skills/stati/`. That is the
source location, not a universal installation destination.

| Application                                          | Project installation                                                         | Personal installation                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Claude Code terminal / Claude Code VS Code extension | `.claude/skills/stati/`                                                      | `~/.claude/skills/stati/`                                                           |
| GitHub Copilot in VS Code                            | `.github/skills/stati/`, `.claude/skills/stati/`, or `.agents/skills/stati/` | `~/.copilot/skills/stati/`, `~/.claude/skills/stati/`, or `~/.agents/skills/stati/` |

For a project shared between Claude Code and Copilot in VS Code, use a **single
copy in `.claude/skills/stati/`**. Do not assume Claude Code scans
`.github/skills/` or `.agents/skills/` merely because another application does.
Claude Desktop/claude.ai has a separate skill installation mechanism; copying
a local repository folder is not the same as installing an account skill.

Copy the whole bundle, preserving:

```text
.claude/
  skills/
    stati/
      SKILL.md
      LICENSE
      references/
      assets/
      scripts/
```

Do not nest it as `stati/stati/SKILL.md`, copy only `SKILL.md`, rename that file,
or omit references. The skill name is `stati`; do not rename its folder.
Copy into a new destination without overwriting an existing installation.
Merge updates intentionally, and avoid duplicate independent copies that drift.

If already installed in `.github/skills/stati/`, moving the **entire bundle** to
`.claude/skills/stati/` makes it available to both Claude Code and Copilot in
VS Code. Moving is optional: a copy also works for Claude Code, but Copilot can
then see duplicate names. Verify before deleting any original files.

## Verify Claude Code discovery separately from automatic invocation

1. Start a fresh Claude Code session **in the project containing the installed
   skill**. This avoids confusing an existing session with a new installation.
2. Open the `/` command menu and check for `/stati`.
3. Run `/stati` at the beginning of a message to explicitly invoke it.
4. If explicit invocation works but ordinary requests skip it, discovery worked:
   the remaining issue is automatic selection, not YAML or the directory.

The bundle has a valid `name` and a relevant `description`; it does not set
`disable-model-invocation: true` or `user-invocable: false`. Adding explicit
`false`/`true` defaults does not make an undiscovered folder discoverable.

Skill descriptions help Claude decide when to invoke skills. They do **not**
guarantee invocation for every task. A prompt such as "adjust the layout" may
not identify the Stati context as clearly as "adjust this Stati site's Eta
layout." For predictable one-off behavior, start the request with:

```text
/stati Update the article layout and verify the production build.
```

## Optional project-level reminder

For a project built with Stati, merge this short instruction into an existing
root `CLAUDE.md`, or create one only when the project owner wants this policy:

```md
## Stati site authoring

This project uses Stati. Before building, changing, or debugging Stati pages,
configuration, Eta templates, partials, or client bundles, invoke the `stati`
skill. Read its Eta reference before editing templates.
If the skill is unavailable, report that and read
`.claude/skills/stati/SKILL.md` and the task-relevant references directly.
Do not substitute generic Eta/EJS or other SSG conventions.
```

This reinforces use through project instructions; it is not deterministic
enforcement or a replacement for a supported skill directory. Do not put this
in every project's global instructions if many projects do not use Stati.

## If `/stati` is still absent

Check in this order:

- Correct application and actual working directory/repository or worktree.
- Correct absolute path ending in `.claude/skills/stati/SKILL.md`.
- Valid YAML, matching name, and all bundle files readable.
- Project skill is not only in a nested subproject Claude has not worked in.
- Personal/project skills or commands do not conflict with the name `stati`.
- Skill invocation is not disabled by settings, permissions, managed policy,
  restricted modes, or SDK configuration that excludes project settings.

Use that failing session's diagnostics when necessary. Do not conclude the model
ignored the skill without first establishing that the application exposed it.
In an SDK integration, filesystem access to a directory alone does not establish
that project customizations are loaded.

## Sources

Directory behavior was checked on 2026-10-10 against:

- [Claude Code skills documentation](https://code.claude.com/docs/en/skills)
- [VS Code Agent Skills documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)

Reread these after application upgrades; supported directories, session refresh,
and settings can change independently of Stati.
