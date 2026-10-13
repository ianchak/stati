# Commit Message Rules

<!-- Mirrors the "Commit messages" section of AGENTS.md. Keep both in sync. -->

- Format: `type(scope): subject` in imperative mood, subject ≤72 chars, no emoji.
- Single line only: no body, no trailers (`Co-Authored-By: ...`, `Signed-off-by: ...`), and no closing keywords (`Closes #123`). The `commit-msg` hook rejects anything after the subject.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Scope is usually the package: `core`, `cli`, `create-stati`, or an area like `isg`, `search`, `docs`.
- Mark breaking changes with `!` after the type (`feat(core)!: ...`). Do not use a `BREAKING CHANGE:` footer.
- Commit types drive releases: `feat` → minor, everything else → patch, `!` → major.
