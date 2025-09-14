import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import type { StatiConfig } from '../types.js';
import { validateISGConfig, ISGConfigurationError } from '../core/isg/validation.js';

/**
 * Default configuration values for Stati.
 * Used as fallback when no configuration file is found.
 */
const DEFAULT_CONFIG: StatiConfig = {
  srcDir: 'site',
  outDir: 'dist',
  staticDir: 'public',
  site: {
    title: 'My Site',
    baseUrl: 'http://localhost:3000',
  },
  isg: {
    enabled: true,
    ttlSeconds: 21600, // 6 hours
    maxAgeCapDays: 365,
  },
};

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
  const configPaths = [
    join(cwd, 'stati.config.ts'),
    join(cwd, 'stati.config.js'),
    join(cwd, 'stati.config.mjs'),
  ];

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
