---
title: Code blocks
description: Syntax highlighting, language names and the copy button.
order: 4
---

## Highlighting

Fence code with three backticks and name the language after them:

````md
```js
export function greet(name) {
  return `Hello, ${name}!`;
}
```
````

That renders as:

```js
export function greet(name) {
  return `Hello, ${name}!`;
}
```

Highlighting happens when the site is built, through the `markdown-it-prism` plugin set up in `stati.config.js`. Pages ship the colored HTML, not a highlighter, so they stay fast.

## Languages

Use any language [Prism](https://prismjs.com/#supported-languages) supports. Common names:

| Language               | Name to use            |
| ---------------------- | ---------------------- |
| JavaScript, TypeScript | `js`, `ts`             |
| Shell commands         | `bash`                 |
| HTML, CSS              | `html`, `css`          |
| JSON, YAML             | `json`, `yaml`         |
| Markdown               | `md`                   |
| Eta templates          | `eta`                  |
| Python, Go, Rust       | `python`, `go`, `rust` |
| No highlighting        | `text`                 |

An unknown name falls back to plain text rather than failing the build. Always name a language: it is shown in the block's header.

```ts
interface User {
  id: number;
  name: string;
  email?: string;
}

export async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`User ${id} not found`);
  return response.json();
}
```

```bash
# Install, then start the dev server
npm install
npm run dev
```

```json
{
  "name": "my-docs",
  "private": true,
  "scripts": { "dev": "stati dev" }
}
```

## Copying

Every block has a **Copy** button in its header. It copies the code exactly as written, without the highlighting.

For shell commands readers will paste, leave out the `$` prompt so the copied text runs as is.

## Inline code

Wrap names from code in single backticks inside a sentence: `npm run build`, `stati.config.js`, `order`.
