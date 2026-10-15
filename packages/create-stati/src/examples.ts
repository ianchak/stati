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
  /**
   * The template ships a stati.config.js that the generated project must keep
   * (hooks, filters, feeds). The scaffolder adapts it instead of replacing it.
   */
  ownConfig: boolean;
  /**
   * The template's stylesheet is its design, so styling processors carry it over
   * instead of replacing it with their own starter styles.
   */
  ownStyles: boolean;
}

/** Templates create-stati can scaffold, in the order they are offered. */
export const TEMPLATES = {
  blank: {
    name: 'blank',
    title: 'Blank Template',
    description:
      'A minimal starter template with basic CSS, semantic HTML, and essential meta tags',
    features: ['Minimal CSS reset', 'Accessibility features', 'SEO-friendly structure'],
    difficulty: 'beginner',
    estimatedSetupTime: '2 minutes',
    ownConfig: false,
    ownStyles: false,
  },
  blog: {
    name: 'blog',
    title: 'Blog Template',
    description:
      'A complete blog with posts, tag pages, a yearly archive, an RSS feed, a sitemap and SEO metadata',
    features: [
      'Posts with tag pages, pagination, archive, newer/older and related posts',
      'RSS feed, sitemap and robots.txt',
      'Open Graph and Twitter link previews',
      'Light and dark themes with self-hosted display type',
    ],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    ownConfig: true,
    ownStyles: true,
  },
  docs: {
    name: 'docs',
    title: 'Docs Template',
    description:
      'A complete documentation site with a sidebar, search, an on-page table of contents and SEO metadata',
    features: [
      'Sidebar built from folders, ordered by front matter, with previous/next links and breadcrumbs',
      'Ctrl+K search over the built-in search index',
      'On-page table of contents with scroll tracking',
      'Build-time syntax highlighting with copy buttons',
      'Light and dark themes, sitemap, robots.txt and SEO metadata',
    ],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    ownConfig: true,
    ownStyles: true,
  },
} satisfies Record<string, ExampleMetadata>;

export type TemplateName = keyof typeof TEMPLATES;

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

/** Type guard for user-supplied template names. */
export function isValidTemplate(value: unknown): value is TemplateName {
  return typeof value === 'string' && Object.hasOwn(TEMPLATES, value);
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
    return TEMPLATE_NAMES.map((name) => ({
      ...TEMPLATES[name],
      features: [...TEMPLATES[name].features],
    }));
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
