/**
 * Tailwind CSS setup processor for the Stati scaffolder.
 * Generates the Tailwind CSS 4 stylesheet and scripts for new projects.
 * @module create-stati/tailwind-processor
 */

import { DEPENDENCY_VERSIONS } from './constants.js';
import type { ProcessorResultWithDeletions } from './types.js';

/**
 * Import Tailwind and scan Stati's class inventory. Tailwind finds the site's templates
 * by itself but skips gitignored folders, and the generated .gitignore lists .stati/.
 */
const TAILWIND_IMPORT = `@import 'tailwindcss';

/* Classes that templates build at render time, such as \`text-\${color}-600\`, listed by Stati */
@source '../.stati/tailwind-classes.html';`;

/** Stati's Tailwind flags: the input, and the output the dev server's watcher writes */
const TAILWIND_FLAGS = '--tailwind-input src/styles.css --tailwind-output dist/styles.css';

/**
 * Generate Tailwind CSS setup files and dependencies.
 * Returns all files and configuration needed for Tailwind support. Tailwind CSS 4 is
 * configured in the stylesheet itself, so there is no tailwind.config.js.
 *
 * `stati dev` and `stati build` run Tailwind themselves. The build runs it after the last page
 * renders and names the stylesheet after its content, `_assets/styles-[hash].css`. The
 * templates keep their link to /styles.css, which production builds point at that file.
 *
 * @param templateCSS - The template's own stylesheet. When given, it is carried over
 *   below the Tailwind import instead of replacing the template's design with
 *   Tailwind starter styles. Either way public/styles.css is removed: it is at the path of
 *   Tailwind's output, so no build copies it.
 * @returns Processor result with files, dependencies, and scripts
 *
 * @example
 * ```typescript
 * const tailwindSetup = setupTailwind();
 * // tailwindSetup.files contains: src/styles.css
 * // tailwindSetup.devDependencies contains: { tailwindcss: '^4.3.3', '@tailwindcss/cli': '^4.3.3' }
 * // tailwindSetup.scripts contains: { dev: 'stati dev --tailwind-input ...', build: 'stati build --tailwind-input ...' }
 * ```
 */
export function setupTailwind(templateCSS?: string): ProcessorResultWithDeletions {
  return {
    files: new Map([
      [
        'src/styles.css',
        templateCSS === undefined ? generateTailwindCSS() : wrapTemplateCSS(templateCSS),
      ],
    ]),
    devDependencies: {
      tailwindcss: DEPENDENCY_VERSIONS.tailwindcss,
      '@tailwindcss/cli': DEPENDENCY_VERSIONS['@tailwindcss/cli'],
    },
    scripts: {
      build: `stati build ${TAILWIND_FLAGS}`,
      dev: `stati dev ${TAILWIND_FLAGS}`,
    },
    filesToDelete: ['public/styles.css'],
  };
}

/**
 * Put the Tailwind import above a template's own stylesheet.
 * The template styles go in the components layer: they win over Tailwind's preflight,
 * and utility classes in templates win over them. Left unlayered, they would beat
 * every utility class, because Tailwind CSS 4 uses native cascade layers.
 */
function wrapTemplateCSS(templateCSS: string): string {
  const indented = templateCSS
    .trimEnd()
    .split('\n')
    .map((line) => (line.trim() ? `  ${line}` : ''))
    .join('\n');

  return `${TAILWIND_IMPORT}

/* The template's styles. Tailwind utilities in templates override them. */
@layer components {
${indented}
}
`;
}

/**
 * Generate starter Tailwind CSS input file.
 * Mirrors the blank template's stylesheet: base styles for Markdown content
 * plus the layout classes used in site/layout.eta.
 *
 * @returns CSS content for src/styles.css
 */
function generateTailwindCSS(): string {
  return `${TAILWIND_IMPORT}

/* Light and dark themes follow the visitor's system setting via dark: variants. */

@layer base {
  html {
    color-scheme: light dark;
    @apply bg-white text-slate-600 antialiased dark:bg-slate-950 dark:text-slate-400;
  }

  body {
    @apply flex min-h-screen flex-col leading-7;
  }

  ::selection {
    @apply bg-blue-600/25 dark:bg-blue-400/25;
  }

  :focus-visible {
    @apply rounded outline outline-2 outline-offset-2 outline-blue-600 dark:outline-blue-400;
  }

  a {
    @apply text-blue-700 underline decoration-blue-700/40 decoration-1 underline-offset-[3px] transition-colors hover:decoration-current dark:text-blue-300 dark:decoration-blue-300/40;
  }

  h1,
  h2,
  h3,
  h4 {
    @apply font-bold leading-tight tracking-tight text-slate-950 dark:text-slate-100;
    text-wrap: balance;
  }

  strong {
    @apply font-semibold text-slate-950 dark:text-slate-100;
  }

  /* Content: everything your Markdown renders into */
  main > * + * {
    @apply mt-5;
  }

  main h1 {
    @apply text-4xl font-extrabold leading-[1.05] tracking-tighter md:text-5xl;
  }

  main h1 + p {
    @apply text-lg;
  }

  main h2 {
    @apply mt-14 border-t border-slate-200 pt-8 text-2xl dark:border-slate-800;
  }

  main h3 {
    @apply mt-10 text-lg;
  }

  main h2 + *,
  main h3 + * {
    @apply mt-3;
  }

  main ul {
    @apply list-disc pl-5;
  }

  main ol {
    @apply list-decimal pl-5;
  }

  main li + li {
    @apply mt-2;
  }

  main li::marker {
    @apply text-slate-500;
  }

  main :not(pre) > code {
    @apply rounded bg-slate-100 px-1 py-0.5 text-[0.875em] text-slate-950 dark:bg-slate-900 dark:text-slate-100;
  }

  main pre {
    @apply overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100;
  }

  main blockquote {
    @apply rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900;
  }

  main hr {
    @apply my-12 border-slate-200 dark:border-slate-800;
  }

  main th,
  main td {
    @apply border-b border-slate-200 py-2 pr-3 text-left dark:border-slate-800;
  }
}

@layer components {
  .skip-link {
    @apply absolute -top-12 left-4 z-50 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white no-underline focus:top-4 dark:bg-blue-400 dark:text-slate-950;
  }

  .wrapper {
    @apply mx-auto w-full max-w-2xl px-5 md:px-6;
  }

  .site-header {
    @apply border-b border-slate-200 dark:border-slate-800;
  }

  .site-header .wrapper {
    @apply flex h-16 items-center justify-between gap-4;
  }

  .logo {
    @apply inline-flex items-center gap-2.5 font-bold text-slate-950 no-underline dark:text-slate-100;
  }

  .site-header nav {
    @apply -mr-3 flex gap-1;
  }

  .site-header nav a {
    @apply rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 no-underline hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100;
  }

  .site-header nav a[aria-current='page'] {
    @apply text-slate-950 dark:text-slate-100;
  }

  main.wrapper {
    @apply flex-1 py-16 md:pb-28 md:pt-24;
  }

  .site-footer {
    @apply border-t border-slate-200 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400;
  }

  .site-footer .wrapper {
    @apply flex flex-wrap justify-between gap-x-6 gap-y-1 py-6;
  }

  .site-footer a {
    @apply text-inherit hover:text-slate-950 dark:hover:text-slate-100;
  }
}
`;
}
