/**
 * @fileoverview Stati - A modern static site generator with TypeScript support
 *
 * @example
 * ```typescript
 * import { build, loadConfig } from 'stati';
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
