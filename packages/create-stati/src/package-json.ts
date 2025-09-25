import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export interface ProjectOptions {
  projectName: string;
}

export class PackageJsonModifier {
  constructor(private options: ProjectOptions) {}

  async modifyPackageJson(projectDir: string): Promise<void> {
    const packageJsonPath = join(projectDir, 'package.json');

    try {
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      // Only modify the name field
      packageJson.name = this.options.projectName;

      // Add Stati SSG engine identifier
      packageJson.stati = {
        engine: 'stati',
        version: packageJson.devDependencies?.['@stati/core'] || '^1.4.0',
      };

      // Write back with proper formatting
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    } catch (error) {
      throw new Error(
        `Failed to modify package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
