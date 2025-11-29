import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generic package.json structure
 */
export interface PackageJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  stati?: {
    engine: string;
    version: string;
  };
  [key: string]: unknown;
}

/**
 * Read and parse package.json from a directory
 */
export async function readPackageJson(projectDir: string): Promise<PackageJson> {
  const packageJsonPath = join(projectDir, 'package.json');
  const content = await readFile(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write package.json to a directory with proper formatting
 */
export async function writePackageJson(
  projectDir: string,
  packageJson: PackageJson,
): Promise<void> {
  const packageJsonPath = join(projectDir, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

/**
 * Update package.json by merging new values
 */
export async function updatePackageJson(
  projectDir: string,
  updates: Partial<PackageJson>,
): Promise<void> {
  const packageJson = await readPackageJson(projectDir);

  // Deep merge for scripts, dependencies, and devDependencies
  if (updates.scripts) {
    packageJson.scripts = { ...packageJson.scripts, ...updates.scripts };
    delete updates.scripts; // Remove so we don't overwrite with Object.assign
  }
  if (updates.dependencies) {
    packageJson.dependencies = { ...packageJson.dependencies, ...updates.dependencies };
    delete updates.dependencies;
  }
  if (updates.devDependencies) {
    packageJson.devDependencies = { ...packageJson.devDependencies, ...updates.devDependencies };
    delete updates.devDependencies;
  }

  // Merge remaining top-level fields
  Object.assign(packageJson, updates);

  await writePackageJson(projectDir, packageJson);
}

/**
 * Update package.json scripts
 */
export async function updatePackageScripts(
  projectDir: string,
  scripts: Record<string, string>,
): Promise<void> {
  await updatePackageJson(projectDir, { scripts });
}

/**
 * Update package.json dependencies
 */
export async function updatePackageDeps(
  projectDir: string,
  deps?: Record<string, string>,
  devDeps?: Record<string, string>,
): Promise<void> {
  const updates: Partial<PackageJson> = {};
  if (deps) updates.dependencies = deps;
  if (devDeps) updates.devDependencies = devDeps;
  await updatePackageJson(projectDir, updates);
}
