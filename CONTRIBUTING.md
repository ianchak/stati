# Contributing to Stati

Thanks for your interest in contributing to **Stati** — a lightweight, TypeScript-first static site generator.

---

## 🛠 Requirements

- **Node.js** 22+
- **npm** (with workspace support)
- Familiarity with TypeScript and monorepo layouts is a plus

---

## 🚧 Project Structure

```
packages/
├─ stati               → CLI: build, invalidate, dev (WIP)
├─ create-stati        → NPX scaffolder (templates, Tailwind opt-in)
examples/
├─ blog
├─ docs
├─ news
```

---

## 📦 Setup

```bash
# Install dependencies
npm install

# Build everything
npm run build --workspaces
```

---

## 📜 Available Scripts

```bash
npm run lint        # ESLint
npm run typecheck   # TS check
npm test            # Vitest (TBD)
npm run build       # Build CLI & scaffolder
npm run ci          # Lint + typecheck + test + build
```

Note: CI runs tests across workspaces but skips packages without a `test` script (uses `--if-present`).

---

## 🔄 Making Changes

### 1. Fork + Clone the Repo

Use your GitHub fork and create a new branch for your change.

### 2. Commit Style

We use **Changesets** for versioning. When your change affects public packages, run:

```bash
npx changeset
```

This creates a `.md` file in `.changeset/` describing the change and its bump type (patch/minor/major).

### 3. Run Tests & CI

Make sure everything passes:

```bash
npm run ci
```

### 4. Open a PR

PRs should be:

- Atomic and focused
- Documented if relevant (README, templates, CLI help)
- Reviewed before merging

---

## 🧹 Coding Style

- TypeScript strict mode
- Small, composable functions
- Minimal external dependencies
- Prefer clarity over cleverness

---

## 🧪 Tests (Coming soon)

- Use `Vitest` for unit tests
- Add tests for cache invalidation, routing, front-matter, TTL logic
- Snapshot-based HTML output tests are acceptable

---

## 🤝 Contributor Roles

- `type:bug`, `type:feat`, `type:chore`, `area:isg`, `area:scaffolder`, etc.
- GitHub templates + labels help guide issues & PRs

---

## 🏁 Release Flow

After merging a PR with a changeset:

```bash
npm run release:version
git push --follow-tags
npm run release:publish
```

---

## 🙏 Thank You!

Your contributions make this project better. Whether you're fixing bugs, suggesting features, writing docs, or improving templates — you’re helping developers build faster, simpler static sites.
