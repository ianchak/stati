import { mkdir, rm, access, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { ExampleManager } from './examples.js';
import { PackageJsonModifier } from './package-json.js';
import { CSSProcessor, type StylingOption } from './css-processors.js';

export interface CreateOptions {
  projectName: string;
  template: 'blank';
  styling: StylingOption;
  gitInit?: boolean;
  installDependencies?: boolean;
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
      if ((error as { code?: string })?.code === 'ENOENT') {
        // Directory doesn't exist, which is what we want
        await mkdir(resolvedDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  private async initializeGit(targetDir: string): Promise<void> {
    try {
      // Import exec dynamically to avoid issues with CommonJS/ESM
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('git init', { cwd: targetDir });

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
      console.warn(
        'Warning: Failed to initialize git repository:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async cleanup(targetDir: string): Promise<void> {
    try {
      await rm(targetDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(`Failed to cleanup directory ${targetDir}:`, cleanupError);
    }
  }

  private displaySuccessMessage(targetDir: string): void {
    console.log(`✨ Successfully created Stati project at ${targetDir}`);
    console.log('\n📝 Next steps:');
    console.log(`  cd ${this.options.projectName}`);

    if (!this.options.installDependencies) {
      console.log('  npm install');
    }

    console.log('  npm run dev');
    console.log('\n🌟 Happy building with Stati!');
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
