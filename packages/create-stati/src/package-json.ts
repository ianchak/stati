import { readPackageJson, writePackageJson } from './utils/package-json.js';

export interface ProjectOptions {
  projectName: string;
}

export class PackageJsonModifier {
  constructor(private options: ProjectOptions) {}

  async modifyPackageJson(projectDir: string): Promise<void> {
    try {
      const packageJson = await readPackageJson(projectDir);

      // Only modify the name field
      packageJson.name = this.options.projectName;

      // Add Stati SSG engine identifier
      packageJson.stati = {
        engine: 'stati',
        version: packageJson.devDependencies?.['@stati/core'] || '^1.4.0',
      };

      // Write back with proper formatting
      await writePackageJson(projectDir, packageJson);
    } catch (error) {
      throw new Error(
        `Failed to modify package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
