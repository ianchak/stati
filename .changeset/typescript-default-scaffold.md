---
"create-stati": minor
---

Make TypeScript the default for new projects

The TypeScript prompt now defaults to yes, and non-interactive runs
create a TypeScript project unless told otherwise. A default project
gets `stati.config.ts`, `tsconfig.json` and `src/main.ts`.

- Added `--no-typescript` (alias `--no-ts`) to scaffold a JavaScript
  project with `stati.config.js`.
- Scripts that pass every option and relied on the old JavaScript
  default should add `--no-typescript`.
- The bundled agent skill lists the new flag.
