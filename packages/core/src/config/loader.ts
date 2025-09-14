import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import type { StatiConfig } from '../types/index.js';
import { validateISGConfig, ISGConfigurationError } from '../core/isg/validation.js';
import {
  DEFAULT_SRC_DIR,
  DEFAULT_OUT_DIR,
  DEFAULT_STATIC_DIR,
  DEFAULT_SITE_TITLE,
  DEFAULT_DEV_BASE_URL,
  DEFAULT_TTL_SECONDS,
  DEFAULT_MAX_AGE_CAP_DAYS,
  CONFIG_FILE_PATTERNS,
} from '../constants.js';

/**
 * Default configuration values for Stati.
 * Used as fallback when no configuration file is found.
 */
const DEFAULT_CONFIG: StatiConfig = {
  srcDir: DEFAULT_SRC_DIR,
  outDir: DEFAULT_OUT_DIR,
  staticDir: DEFAULT_STATIC_DIR,
  site: {
    title: DEFAULT_SITE_TITLE,
    baseUrl: DEFAULT_DEV_BASE_URL,
  },
  isg: {
    enabled: true,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    maxAgeCapDays: DEFAULT_MAX_AGE_CAP_DAYS,
  },
};

/**
 * Builds config file paths for a given directory.
 * @param cwd - Directory to search for config files
 * @returns Array of absolute paths to potential config files
 */
export function getConfigFilePaths(cwd: string): string[] {
  return CONFIG_FILE_PATTERNS.map((pattern) => join(cwd, pattern));
}

/**
 * Loads and validates Stati configuration from the project directory.
 * Searches for configuration files in order: stati.config.ts, stati.config.js, stati.config.mjs
 *
 * @param cwd - Current working directory to search for config files
 * @returns Promise resolving to the merged configuration object
 *
 * @example
 * ```typescript
 * import { loadConfig } from 'stati';
 *
 * // Load config from current directory
 * const config = await loadConfig();
 *
 * // Load config from specific directory
 * const config = await loadConfig('/path/to/project');
 * ```
 *
 * @throws {Error} When configuration file exists but contains invalid JavaScript/TypeScript
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<StatiConfig> {
  const configPaths = getConfigFilePaths(cwd);

  let configPath: string | null = null;
  for (const path of configPaths) {
    if (existsSync(path)) {
      configPath = path;
      break;
    }
  }

  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  try {
    const configUrl = pathToFileURL(resolve(configPath)).href;
    const module = await import(configUrl);
    const userConfig = module.default || module;

    const mergedConfig: StatiConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      site: { ...DEFAULT_CONFIG.site, ...userConfig.site },
      isg: { ...DEFAULT_CONFIG.isg, ...userConfig.isg },
    };

    // Validate ISG configuration
    try {
      if (mergedConfig.isg) {
        validateISGConfig(mergedConfig.isg);
      }
    } catch (error) {
      if (error instanceof ISGConfigurationError) {
        throw new Error(
          `Invalid ISG configuration in ${configPath}:\n` +
            `${error.code}: ${error.message}\n` +
            `Field: ${error.field}, Value: ${JSON.stringify(error.value)}\n\n` +
            `Please check your stati.config.ts file and correct the ISG configuration.`,
        );
      }
      throw error; // Re-throw non-ISG errors
    }

    return mergedConfig;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid ISG configuration')) {
      // ISG validation errors should bubble up with context
      throw error;
    }

    console.error(`Error loading config from ${configPath}:`, error);
    console.error('Falling back to default configuration.');
    return DEFAULT_CONFIG;
  }
}
