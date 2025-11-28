import { readPackageJson, writePackageJson, formatErrorMessage } from './utils/index.js';
import { setupTypeScript } from './typescript-processor.js';

export interface ProjectOptions {
  projectName: string;
  typescript?: boolean | undefined;
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

      // Add TypeScript dependencies and scripts if enabled
      if (this.options.typescript) {
        const tsSetup = setupTypeScript();

        // Merge TypeScript devDependencies
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          ...tsSetup.devDependencies,
        };

        // Merge TypeScript scripts
        packageJson.scripts = {
          ...packageJson.scripts,
          ...tsSetup.scripts,
        };
      }

      // Write back with proper formatting
      await writePackageJson(projectDir, packageJson);
    } catch (error) {
      throw new Error(`Failed to modify package.json: ${formatErrorMessage(error)}`);
    }
  }
}
