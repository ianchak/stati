import { mkdir, rm, access, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { setTimeout, clearTimeout } from 'timers';
import { ExampleManager } from './examples.js';
import { PackageJsonModifier } from './package-json.js';
import { CSSProcessor } from './css-processors.js';
import type { StylingOption } from './css-processors.js';

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
  try {
    const { spawn } = await import('child_process');

    const available: PackageManager[] = [];

    for (const manager of ALLOWED_PACKAGE_MANAGERS) {
      try {
        await new Promise<void>((resolve, reject) => {
          // Only use shell on Windows
          const child = spawn(manager, ['--version'], {
            stdio: 'ignore',
            shell: process.platform === 'win32',
          });

          const timeout = setTimeout(() => {
            child.kill();
            reject(new Error('Timeout'));
          }, 5000); // 5 second timeout to account for slower systems

          child.on('error', () => {
            clearTimeout(timeout);
            reject();
          });

          child.on('exit', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
              resolve();
            } else {
              reject();
            }
          });
        });
        available.push(manager);
      } catch (error) {
        // Manager not available, skip
        // Log at debug level if verbose logging is enabled
        if (process.env.DEBUG) {
          console.debug(
            `Package manager ${manager} not detected:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
        continue;
      }
    }

    return available;
  } catch (error) {
    // Log error for debugging purposes
    if (process.env.DEBUG) {
      console.debug(
        'Error detecting package managers:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
    return [];
  }
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
 * - Resolves to an absolute path
 * - Rejects paths with null bytes
 * - Ensures the path is within safe boundaries (not root or system directories)
 * - Prevents creation in common system directories across all drive letters
 *
 * Note: We intentionally allow symlinks as they are commonly used in development workflows.
 * The parent scaffolding logic will perform additional validation before writing files.
 */
function validateDirectoryPath(dirPath: string): string {
  // Resolve to absolute path to prevent relative path exploits
  const absolutePath = resolve(dirPath);

  // Basic validation - reject paths with null bytes
  if (absolutePath.includes('\0')) {
    throw new Error('Invalid directory path: contains null byte');
  }

  // Normalize path separators and convert to lowercase for consistent comparison
  const normalizedPath = absolutePath.replace(/\\/g, '/').toLowerCase();
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

  // Check if the path contains or starts with any system directory
  for (const pattern of systemPathPatterns) {
    // Normalize the pattern to lowercase and trim whitespace
    const normalizedPattern = pattern.toLowerCase().trim();

    // For patterns without leading slash (like 'windows'), check if it appears after a drive letter
    if (!normalizedPattern.startsWith('/')) {
      // Pattern like 'windows' should match 'c:/windows' or 'd:/windows'
      const regex = new RegExp(
        `^[a-z]:/` + normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/|$)',
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
  gitInit?: boolean;
  install?: boolean;
  packageManager?: PackageManager;
  dir?: string;
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

      // 3. Modify package.json with project name
      const packageModifier = new PackageJsonModifier({ projectName: this.options.projectName });
      await packageModifier.modifyPackageJson(targetDir);

      // 4. Setup CSS preprocessing if requested
      const cssProcessor = new CSSProcessor();
      await cssProcessor.processStyling(targetDir, this.options.styling);

      // 5. Initialize git (optional)
      if (this.options.gitInit) {
        await this.initializeGit(targetDir);
      }

      // 6. Install dependencies (optional)
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
      // Import spawn for better security and control
      const { spawn } = await import('child_process');

      await new Promise<void>((resolve, reject) => {
        const child = spawn('git', ['init'], {
          cwd: targetDir,
          stdio: 'ignore',
          shell: process.platform === 'win32',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`git init exited with code ${code}`));
          }
        });
      });

      // Create .gitignore if it doesn't exist
      const gitignoreContent = `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
.stati/

# Generated CSS files (Tailwind, Sass, etc.)
public/styles.css
public/style.css
src/styles.min.css
css/styles.css

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
      console.warn(
        'Warning: Failed to initialize git repository:',
        error instanceof Error ? error.message : 'Unknown error',
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
    const packageManager = this.options.packageManager || 'npm';

    // Validate package manager is in the allowed list
    if (!ALLOWED_PACKAGE_MANAGERS.includes(packageManager as PackageManager)) {
      throw new Error(
        `SECURITY: Invalid package manager '${packageManager}'. ` +
          `Only allowed values are: ${ALLOWED_PACKAGE_MANAGERS.join(', ')}`,
      );
    }

    // Validate and sanitize target directory
    const safeTargetDir = validateDirectoryPath(targetDir);

    console.log(`\n📦 Installing dependencies with ${packageManager}...`);

    try {
      const { spawn } = await import('child_process');

      await new Promise<void>((resolve, reject) => {
        // SECURITY: shell: true is safe here ONLY because packageManager has been
        // validated above to be from ALLOWED_PACKAGE_MANAGERS (hardcoded list).
        // Any future modifications to ALLOWED_PACKAGE_MANAGERS must maintain this guarantee.
        const child = spawn(packageManager, ['install'], {
          cwd: safeTargetDir,
          stdio: 'inherit', // Show install progress to user
          shell: process.platform === 'win32',
        });

        child.on('error', (error) => {
          reject(
            new Error(
              `Failed to spawn ${packageManager}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
        });

        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`${packageManager} install exited with code ${code}`));
          }
        });
      });

      console.log('Dependencies installed successfully');
      return { success: true };
    } catch (error) {
      // Provide more specific error handling based on error type
      const capturedError = error instanceof Error ? error : new Error('Unknown error');
      const errorMessage = capturedError.message;
      const suggestion = getInstallErrorSuggestion(capturedError, packageManager);

      // Installation is optional, so we warn instead of failing the entire scaffolding
      console.warn('\nWarning: Failed to install dependencies:', errorMessage);
      console.warn(suggestion);

      // Log stack trace in debug mode
      if (process.env.DEBUG && capturedError.stack) {
        console.warn('Stack trace:', capturedError.stack);
      }

      return { success: false, error: capturedError };
    }
  }

  private async cleanup(targetDir: string): Promise<void> {
    try {
      await rm(targetDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(`Failed to cleanup directory ${targetDir}:`, cleanupError);
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
