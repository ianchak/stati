import type { Logger, StatiConfig } from '../types/index.js';
import { loadConfig } from '../config/loader.js';
import { resolveDevPaths } from './utils/index.js';

/**
 * The configuration a dev or preview server runs with
 */
export interface ServerConfig {
  /** The configuration from the current directory */
  config: StatiConfig;
  /** The absolute source directory */
  srcDir: string;
  /** The absolute output directory, which the server serves */
  outDir: string;
  /** The absolute static assets directory */
  staticDir: string;
}

/**
 * Loads the configuration for the dev and preview servers from the current directory, as
 * `stati build` does.
 *
 * @param logger - Logs the error when the configuration cannot be loaded
 * @throws The loading or validation error
 */
export async function loadServerConfig(logger: Logger): Promise<ServerConfig> {
  try {
    const config = await loadConfig(process.cwd());
    return { config, ...resolveDevPaths(config) };
  } catch (error) {
    logger.error?.(
      `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
