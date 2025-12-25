type Env = 'development' | 'production' | 'test';

let currentEnv: Env = (process.env.NODE_ENV as Env) || 'development';

export function setEnv(env: Env) {
  currentEnv = env;
}

export function getEnv(): Env {
  return currentEnv;
}

/**
 * Check if the current environment is development.
 * Useful for conditional logic that only runs during development builds.
 *
 * @returns `true` if in development mode, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isDevelopment()) {
 *   // Enable verbose logging
 *   logger.debug('Detailed debug information');
 * }
 * ```
 */
export function isDevelopment(): boolean {
  return currentEnv === 'development';
}

/**
 * Check if the current environment is production.
 * Useful for conditional logic that only runs during production builds.
 *
 * @returns `true` if in production mode, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isProduction()) {
 *   // Generate sitemap and robots.txt
 *   generateSitemap();
 * }
 * ```
 */
export function isProduction(): boolean {
  return currentEnv === 'production';
}

/**
 * Check if the current environment is test.
 * Useful for conditional logic during test execution.
 *
 * @returns `true` if in test mode, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isTest()) {
 *   // Use mock data
 *   return getMockData();
 * }
 * ```
 */
export function isTest(): boolean {
  return currentEnv === 'test';
}
