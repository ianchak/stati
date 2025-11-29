/**
 * TypeScript setup processor for the Stati scaffolder.
 * Generates TypeScript configuration files and starter code for new projects.
 * @module create-stati/typescript-processor
 */

/**
 * Result of TypeScript setup containing files and dependencies to add.
 */
export interface TypeScriptSetupResult {
  /** Map of relative file path to file content */
  files: Map<string, string>;
  /** Dev dependencies to add to package.json */
  devDependencies: Record<string, string>;
  /** Scripts to add to package.json */
  scripts: Record<string, string>;
}

/**
 * Generate TypeScript setup files and dependencies.
 * Returns all files and configuration needed for TypeScript support.
 *
 * @returns TypeScript setup result with files, dependencies, and scripts
 *
 * @example
 * ```typescript
 * const tsSetup = setupTypeScript();
 * // tsSetup.files contains: tsconfig.json, src/main.ts
 * // tsSetup.devDependencies contains: { typescript: '^5.6.0' }
 * // tsSetup.scripts contains: { typecheck: 'tsc --noEmit' }
 * ```
 */
export function setupTypeScript(): TypeScriptSetupResult {
  return {
    files: new Map([
      ['tsconfig.json', generateTsConfig()],
      ['src/main.ts', generateMainTs()],
    ]),
    devDependencies: {
      typescript: '^5.6.0',
    },
    scripts: {
      typecheck: 'tsc --noEmit',
    },
  };
}

/**
 * Generate tsconfig.json content for Stati projects.
 * Configured for modern browser targets with esbuild handling the actual compilation.
 *
 * @returns JSON string content for tsconfig.json
 */
function generateTsConfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
      isolatedModules: true,
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      rootDir: 'src',
    },
    include: ['src/**/*.ts'],
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate starter main.ts content.
 * Provides a simple starting point with DOMContentLoaded example.
 *
 * @returns TypeScript source code for main.ts
 */
function generateMainTs(): string {
  return `// TypeScript entry point
// This file is compiled by Stati using esbuild

console.log('Hello from Stati TypeScript!');

// Example: Add interactivity to your site
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');
});
`;
}
