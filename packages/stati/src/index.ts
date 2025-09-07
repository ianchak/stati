/**
 * @fileoverview Stati - A modern static site generator with TypeScript support
 *
 * @example
 * ```typescript
 * import { build, loadConfig, defineConfig } from 'stati';
 *
 * // Define configuration with TypeScript support
 * export default defineConfig({
 *   site: {
 *     title: 'My Site',
 *     baseUrl: 'https://example.com',
 *   },
 *   // ... other config options
 * });
 *
 * // Load configuration and build site
 * const config = await loadConfig();
 * await build({ clean: true });
 * ```
 */

export type {
  StatiConfig,
  PageModel,
  FrontMatter,
  BuildContext,
  PageContext,
  BuildHooks,
  NavNode,
  ISGConfig,
  AgingRule,
  BuildStats,
} from './types.js';

export type { BuildOptions } from './core/build.js';

export { build } from './core/build.js';
export { loadConfig } from './config/loader.js';

// Import for implementation use
import type { StatiConfig } from './types.js';

/**
 * Helper function for defining Stati configuration with TypeScript IntelliSense.
 * Provides type checking and autocompletion for configuration options.
 *
 * @param config - The Stati configuration object
 * @returns The same configuration object with proper typing
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'stati';
 *
 * export default defineConfig({
 *   site: {
 *     title: 'My Blog',
 *     baseUrl: 'https://myblog.com',
 *   },
 *   srcDir: 'content',
 *   outDir: 'public',
 *   isg: {
 *     enabled: true,
 *     ttlSeconds: 3600,
 *   },
 *   hooks: {
 *     beforeAll: async (ctx) => {
 *       console.log(`Building ${ctx.pages.length} pages`);
 *     },
 *   },
 * });
 * ```
 */
export function defineConfig(config: StatiConfig): StatiConfig {
  return config;
}
