import { mkdir, rm, access, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ExampleManager } from './examples.js';
import { PackageJsonModifier } from './package-json.js';
import { processStyling } from './css-processors.js';
import { writeProcessorFiles } from './utils/index.js';
import type { StylingOption } from './css-processors.js';
import { setupTypeScript } from './typescript-processor.js';
import { isCommandAvailable, spawnProcess, logger } from './utils/index.js';

/**
 * Result of a dependency installation attempt
 */
export interface InstallResult {
  success: boolean;
  error?: Error;
}

/**
 * Allowed package managers that can be used for dependency installation.
 */
export const ALLOWED_PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm', 'bun'] as const;
export type PackageManager = (typeof ALLOWED_PACKAGE_MANAGERS)[number];

/**
 * Detect all available package managers installed on the system
 */
export async function detectAvailablePackageManagers(): Promise<PackageManager[]> {
  const available: PackageManager[] = [];

  for (const manager of ALLOWED_PACKAGE_MANAGERS) {
    if (await isCommandAvailable(manager, 5000)) {
      available.push(manager);
    }
  }

  return available;
}

/**
 * Type guard to check if an error has a code property
 */
function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Validate and sanitize a directory path to prevent path traversal and other security issues.
 * This function:
 * - Normalizes input (trim whitespace, handle unicode)
 * - Resolves to an absolute path
 * - Rejects paths with null bytes
 * - Ensures the path is within safe boundaries (not root or system directories)
 * - Prevents creation in common system directories across all drive letters
 *
 * Note: We intentionally allow symlinks as they are commonly used in development workflows.
 * The parent scaffolding logic will perform additional validation before writing files.
 */
function validateDirectoryPath(dirPath: string): string {
  // Normalize input: trim whitespace and normalize unicode characters
  // This prevents bypasses using trailing/leading spaces or unicode variants
  const trimmedPath = dirPath.trim().normalize('NFC');

  // Resolve to absolute path to prevent relative path exploits
  const absolutePath = resolve(trimmedPath);

  // Basic validation - reject paths with null bytes
  if (absolutePath.includes('\0')) {
    throw new Error('Invalid directory path: contains null byte');
  }

  // Normalize path separators and convert to lowercase for consistent comparison
  const normalizedPath = absolutePath.replace(/\\/g, '/').toLowerCase().trim();
  const pathParts = normalizedPath.split('/').filter(Boolean);

  // Reject if trying to write to root or system-critical paths
  if (pathParts.length < 1) {
    throw new Error('Invalid directory path: cannot create project in root directory');
  }

  // On Windows, check we're not in a drive root (e.g., C:\, D:\, etc.)
  if (process.platform === 'win32' && pathParts.length < 2) {
    throw new Error('Invalid directory path: cannot create project in drive root');
  }

  // List of common system directories to avoid (case-insensitive, without drive letters)
  // These will be checked against the normalized path
  const systemPathPatterns = [
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/lib',
    '/lib64',
    '/boot',
    '/sys',
    '/proc',
    '/dev',
    '/system', // Android/ChromeOS
    '/library', // macOS
    'windows', // Any drive: C:/windows, D:/windows, etc.
    'program files', // Any drive
    'program files (x86)', // Any drive
    'programdata', // Windows system data
    'windows.old', // Old Windows installations
  ];

  // Exceptions: paths that should be allowed despite matching system patterns
  const allowedExceptions: string[] = [];

  // macOS temporary directories (os.tmpdir())
  if (process.platform === 'darwin') {
    allowedExceptions.push('/var/folders/');
  }

  // Check if the path is in an allowed exception
  for (const exception of allowedExceptions) {
    const normalizedExc = exception.toLowerCase().trim();
    if (normalizedPath.startsWith(normalizedExc)) {
      return absolutePath; // Allow this path
    }
  }

  // Check if the path contains or starts with any system directory
  for (const pattern of systemPathPatterns) {
    // Normalize the pattern to lowercase and trim whitespace
    const normalizedPattern = pattern.toLowerCase().trim();

    // For patterns without leading slash (like 'windows'), check if it appears after a drive letter
    if (!normalizedPattern.startsWith('/')) {
      // Pattern like 'windows' should match 'c:/windows' or 'd:/windows'
      const regex = new RegExp(
        `^[a-z]:/${normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`,
      );
      if (regex.test(normalizedPath) || normalizedPath.includes(`/${normalizedPattern}/`)) {
        throw new Error(
          `Invalid directory path: cannot create project in system directory (${pattern})`,
        );
      }
    } else {
      // Pattern starts with '/', check exact match or prefix
      if (
        normalizedPath === normalizedPattern ||
        normalizedPath.startsWith(normalizedPattern + '/')
      ) {
        throw new Error(
          `Invalid directory path: cannot create project in system directory (${pattern})`,
        );
      }
    }
  }

  return absolutePath;
}

/**
 * Get user-friendly error suggestion based on error type
 */
function getInstallErrorSuggestion(error: Error, packageManager: string): string {
  const message = error.message;

  if (message.includes('EACCES') || message.includes('permission')) {
    return `Permission denied. Try running with appropriate permissions or check directory ownership.\nThen run: ${packageManager} install`;
  } else if (message.includes('ENOENT')) {
    return `${packageManager} not found. Please ensure it's installed and in your PATH.\nThen run: ${packageManager} install`;
  } else if (message.includes('network') || message.includes('ETIMEDOUT')) {
    return `Network error. Check your internet connection and try again.\nThen run: ${packageManager} install`;
  }

  return `You can install them manually by running: ${packageManager} install`;
}

export interface CreateOptions {
  projectName: string;
  template: 'blank';
  styling: StylingOption;
  typescript?: boolean;
  gitInit?: boolean;
  install?: boolean;
  packageManager?: PackageManager;
  dir?: string;
}

/**
 * Generate the appropriate config file based on options.
 * Returns TypeScript config when typescript is enabled, JavaScript otherwise.
 */
function generateConfigFile(options: CreateOptions): { filename: string; content: string } {
  if (options.typescript) {
    return {
      filename: 'stati.config.ts',
      content: generateTypeScriptConfig(options),
    };
  }

  return {
    filename: 'stati.config.js',
    content: generateJavaScriptConfig(options),
  };
}

/**
 * Generate TypeScript configuration file content.
 * Includes full TypeScript config with all settings.
 */
function generateTypeScriptConfig(options: CreateOptions): string {
  return `import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: '${options.projectName}',
    description: 'A Stati site',
  },
  typescript: {
    enabled: true,
  },
});
`;
}

/**
 * Generate JavaScript configuration file content.
 * Minimal config without TypeScript settings.
 */
function generateJavaScriptConfig(options: CreateOptions): string {
  return `import { defineConfig } from '@stati/core';

export default defineConfig({
  site: {
    title: '${options.projectName}',
    description: 'A Stati site',
  },
});
`;
}

export class ProjectScaffolder {
  constructor(
    private options: CreateOptions,
    private examplesManager: ExampleManager,
  ) {}

  async create(targetDir: string): Promise<void> {
    let cleanupNeeded = false;

    try {
      // 1. Validate and prepare directory
      await this.validateAndPrepareDirectory(targetDir);
      cleanupNeeded = true;

      // 2. Copy example files directly
      await this.examplesManager.copyExample(this.options.template, targetDir);

      // 3. Generate and write config file (stati.config.ts or stati.config.js)
      const configFile = generateConfigFile(this.options);
      // Remove template config file if we're writing a different one (e.g., TS replacing JS)
      const templateConfigPath = join(targetDir, 'stati.config.js');
      if (configFile.filename !== 'stati.config.js') {
        try {
          await rm(templateConfigPath);
        } catch {
          // Ignore if file doesn't exist
        }
      }
      await writeFile(join(targetDir, configFile.filename), configFile.content);

      // 4. Setup TypeScript if enabled
      if (this.options.typescript) {
        const tsSetup = setupTypeScript();
        await writeProcessorFiles(targetDir, tsSetup.files);
      }

      // 5. Modify package.json with project name and TypeScript deps if needed
      const packageModifier = new PackageJsonModifier({
        projectName: this.options.projectName,
        typescript: this.options.typescript,
      });
      await packageModifier.modifyPackageJson(targetDir);

      // 6. Setup CSS preprocessing if requested
      await processStyling(targetDir, this.options.styling);

      // 7. Initialize git (optional)
      if (this.options.gitInit) {
        await this.initializeGit(targetDir);
      }

      // 8. Install dependencies (optional)
      if (this.options.install) {
        await this.installDependencies(targetDir);
      }

      // Success! (Don't display message here, let the caller handle it)
    } catch (error) {
      // Cleanup on failure
      if (cleanupNeeded) {
        await this.cleanup(targetDir);
      }
      throw error;
    }
  }

  private async validateAndPrepareDirectory(targetDir: string): Promise<void> {
    const resolvedDir = resolve(targetDir);

    try {
      await access(resolvedDir);
      // Directory exists, check if it's empty
      const dirStat = await stat(resolvedDir);
      if (dirStat.isDirectory()) {
        throw new Error(
          `Directory ${resolvedDir} already exists. Please choose a different name or remove the existing directory.`,
        );
      } else {
        throw new Error(
          `A file with the name ${resolvedDir} already exists. Please choose a different name.`,
        );
      }
    } catch (error) {
      if (isErrorWithCode(error) && error.code === 'ENOENT') {
        // Directory doesn't exist, which is what we want
        await mkdir(resolvedDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  private async initializeGit(targetDir: string): Promise<void> {
    try {
      await spawnProcess('git', ['init'], {
        cwd: targetDir,
        stdio: 'ignore',
      });

      // Create .gitignore if it doesn't exist
      const gitignoreContent = `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
.stati/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage
coverage/
.nyc_output/
`;

      const { writeFile } = await import('fs/promises');
      await writeFile(join(targetDir, '.gitignore'), gitignoreContent);
    } catch (error) {
      // Git initialization is optional, so we just warn instead of failing
      logger.warn(
        'Warning: Failed to initialize git repository: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  /**
   * Install dependencies using the specified package manager.
   *
   * This method will attempt to install dependencies but will NOT throw on failure.
   * Instead, it returns an InstallResult object indicating success/failure, allowing
   * callers to react programmatically. Error messages are still logged to the console.
   *
   * @param targetDir - The directory where dependencies should be installed
   * @returns {Promise<InstallResult>} Result indicating success and any error encountered
   * @throws {Error} Only throws if packageManager validation fails (before attempting install)
   */
  private async installDependencies(targetDir: string): Promise<InstallResult> {
    const packageManager: PackageManager = this.options.packageManager || 'npm';

    // Validate package manager is in the allowed list
    if (!ALLOWED_PACKAGE_MANAGERS.includes(packageManager)) {
      throw new Error(
        `SECURITY: Invalid package manager '${packageManager}'. ` +
          `Only allowed values are: ${ALLOWED_PACKAGE_MANAGERS.join(', ')}`,
      );
    }

    // Validate and sanitize target directory
    const safeTargetDir = validateDirectoryPath(targetDir);

    logger.log(`\nInstalling dependencies with ${packageManager}...`);

    try {
      await spawnProcess(packageManager, ['install'], {
        cwd: safeTargetDir,
        stdio: 'inherit', // Show install progress to user
      });

      logger.log('Dependencies installed successfully');
      return { success: true };
    } catch (error) {
      // Provide more specific error handling based on error type
      const capturedError = error instanceof Error ? error : new Error('Unknown error');
      const errorMessage = capturedError.message;
      const suggestion = getInstallErrorSuggestion(capturedError, packageManager);

      // Installation is optional, so we warn instead of failing the entire scaffolding
      logger.warn('\nWarning: Failed to install dependencies: ' + errorMessage);
      logger.warn(suggestion);

      return { success: false, error: capturedError };
    }
  }

  private async cleanup(targetDir: string): Promise<void> {
    try {
      await rm(targetDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup directory ${targetDir}: ${cleanupError}`);
    }
  }
}

export async function createSite(
  options: CreateOptions,
): Promise<{ targetDir: string; projectName: string }> {
  const targetDir = options.dir ? resolve(options.dir) : resolve(options.projectName);
  const examplesManager = new ExampleManager();
  const scaffolder = new ProjectScaffolder(options, examplesManager);

  await scaffolder.create(targetDir);

  return { targetDir, projectName: options.projectName };
}
