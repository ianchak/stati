import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gets the current version of Stati core from package.json
 * @returns The version string
 */
export function getStatiVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Return fallback if version is missing, empty, or not a string
    if (
      !packageJson.version ||
      typeof packageJson.version !== 'string' ||
      packageJson.version.trim() === ''
    ) {
      return '1.0.0';
    }

    return packageJson.version;
  } catch {
    // Fallback for cases where package.json can't be read
    return '1.0.0';
  }
}
