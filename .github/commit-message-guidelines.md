# Commit Message Rules

<!-- Mirrors the "Commit messages" section of AGENTS.md. Keep both in sync. -->

- Format: `type(scope): subject` in imperative mood, subject ≤72 chars.
- Body: what changed and why; wrap at 72; no emoji.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Scope is usually the package: `core`, `cli`, `create-stati`, or an area like `isg`, `search`, `docs`.
- Mark breaking changes with `!` after the type (`feat(core)!: ...`) or a `BREAKING CHANGE:` footer.
- Commit types drive releases: `feat` → minor, everything else → patch, `!`/`BREAKING CHANGE` → major.
