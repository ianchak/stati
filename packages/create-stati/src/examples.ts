import { readdir, stat, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ExampleMetadata {
  name: string;
  title: string;
  description: string;
  features: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: string;
}

export class ExampleManager {
  private examplesDir: string;

  constructor() {
    // In published package: templates are copied to dist/templates during build
    // In development: fall back to ../../examples for local testing
    const publishedTemplatesDir = join(__dirname, 'templates');
    const devTemplatesDir = join(__dirname, '..', '..', '..', 'examples');

    // Check if we're in a published package (templates directory exists)
    if (existsSync(publishedTemplatesDir)) {
      this.examplesDir = publishedTemplatesDir;
    } else {
      this.examplesDir = devTemplatesDir;
    }
  }

  async getAvailableExamples(): Promise<ExampleMetadata[]> {
    // For now, return hardcoded blank template metadata
    // In the future this could scan the examples directory
    return [
      {
        name: 'blank',
        title: 'Blank Template',
        description:
          'A minimal starter template with basic CSS, semantic HTML, and essential meta tags',
        features: ['Minimal CSS reset', 'Accessibility features', 'SEO-friendly structure'],
        difficulty: 'beginner',
        estimatedSetupTime: '2 minutes',
      },
    ];
  }

  async copyExample(exampleName: string, targetDir: string): Promise<void> {
    const sourceDir = join(this.examplesDir, exampleName);

    try {
      await stat(sourceDir);
    } catch {
      throw new Error(`Example template '${exampleName}' not found at ${sourceDir}`);
    }

    await this.copyWithProcessing(sourceDir, targetDir);
  }

  private async copyWithProcessing(sourceDir: string, targetDir: string): Promise<void> {
    // Files and directories to exclude when copying
    const filesToExclude = new Set([
      '.stati',
      'dist',
      'node_modules',
      '.git',
      '.gitignore',
      'coverage',
      '.coverage',
      '.nyc_output',
      '.next',
      '.nuxt',
      '.vscode',
      '.idea',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
    ]);

    await this.copyDirectory(sourceDir, targetDir, filesToExclude);
  }

  private async copyDirectory(
    sourceDir: string,
    targetDir: string,
    filesToExclude: Set<string>,
  ): Promise<void> {
    const items = await readdir(sourceDir);

    for (const item of items) {
      // Skip excluded files/directories
      if (filesToExclude.has(item)) {
        continue;
      }

      const sourcePath = join(sourceDir, item);
      const targetPath = join(targetDir, item);
      const itemStat = await stat(sourcePath);

      if (itemStat.isDirectory()) {
        await mkdir(targetPath, { recursive: true });
        await this.copyDirectory(sourcePath, targetPath, filesToExclude);
      } else {
        // Ensure target directory exists
        await mkdir(dirname(targetPath), { recursive: true });

        // Copy all files directly (no variable substitution)
        await copyFile(sourcePath, targetPath);
      }
    }
  }
}
