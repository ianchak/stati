#!/usr/bin/env node
import inquirer from 'inquirer';
import { createSite, detectAvailablePackageManagers, ALLOWED_PACKAGE_MANAGERS } from './create.js';
import type { CreateOptions, PackageManager } from './create.js';

/**
 * Validate that a string is a valid package manager
 */
function isValidPackageManager(value: string): value is PackageManager {
  return ALLOWED_PACKAGE_MANAGERS.includes(value as PackageManager);
}

/**
 * Professional color palette for Stati CLI - matching the main CLI colors
 */
const colors = {
  brand: (text: string) => `\x1b[38;2;79;70;229m${text}\x1b[0m`, // #4f46e5 - Professional indigo
  success: (text: string) => `\x1b[38;2;22;163;74m${text}\x1b[0m`, // #16a34a - Muted forest green
  error: (text: string) => `\x1b[38;2;220;38;38m${text}\x1b[0m`, // #dc2626 - Muted red
  warning: (text: string) => `\x1b[38;2;217;119;6m${text}\x1b[0m`, // #d97706 - Muted amber
  info: (text: string) => `\x1b[38;2;37;99;235m${text}\x1b[0m`, // #2563eb - Muted steel blue
  muted: (text: string) => `\x1b[38;2;107;114;128m${text}\x1b[0m`, // #6b7280 - Warm gray
  highlight: (text: string) => `\x1b[38;2;8;145;178m${text}\x1b[0m`, // #0891b2 - Muted teal
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`, // Bold styling
};

export async function parseArgs(
  args: string[] = process.argv.slice(2),
): Promise<Partial<CreateOptions> | null> {
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`${colors.bold('create-stati')} - Create a new Stati static site

Usage:
  create-stati [project-name] [options]

Options:
  --template <name>        Template to use (blank)
  --styling <type>         CSS solution (css|sass|tailwind)
  --no-git                 Skip git initialization (default: initializes Git)
  --no-install             Skip dependency installation (default: installs dependencies)
  --package-manager <pm>   Package manager to use (npm|yarn|pnpm|bun)
  --help, -h               Show this help message

Examples:
  create-stati my-site
  create-stati my-blog --styling=sass
  create-stati my-app --template=blank --styling=tailwind --package-manager=pnpm
  create-stati my-app --no-install --no-git
`);
    return null;
  }

  const options: Partial<CreateOptions> = {};
  let projectName = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) continue;

    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');

      switch (key) {
        case 'template':
          options.template = (value || args[++i]) as 'blank';
          break;
        case 'styling':
          options.styling = (value || args[++i]) as 'css' | 'sass' | 'tailwind';
          break;
        case 'no-git':
          options.gitInit = false;
          break;
        case 'no-install':
          options.install = false;
          break;
        case 'package-manager': {
          const pmValue = value || args[++i];
          // Check for missing or empty value
          if (!pmValue || pmValue.trim() === '') {
            console.error(
              colors.error(
                `Missing value for --package-manager. Allowed values: ${ALLOWED_PACKAGE_MANAGERS.join(', ')}`,
              ),
            );
            process.exit(1);
          } else if (isValidPackageManager(pmValue)) {
            options.packageManager = pmValue;
          } else {
            console.error(
              colors.error(
                `Invalid package manager: '${pmValue}'. Allowed values: ${ALLOWED_PACKAGE_MANAGERS.join(', ')}`,
              ),
            );
            process.exit(1);
          }
          break;
        }
      }
    } else if (!projectName && arg) {
      projectName = arg;
    }
  }

  if (projectName) {
    options.projectName = projectName;
  }

  return options;
}

export async function runCLI(cliOptions?: Partial<CreateOptions> | null): Promise<void> {
  if (cliOptions === null) {
    return; // Help was shown
  }

  const options = cliOptions || {};

  console.log(colors.bold(colors.brand('Welcome to Stati')));
  console.log(colors.muted('Create a new static site with Stati\n'));

  // Determine what prompts we need based on CLI args
  const prompts = [];

  if (!options.projectName) {
    prompts.push({
      name: 'name',
      message: 'Project name:',
      default: 'my-stati-site',
      validate: (input: string) => {
        if (!input.trim()) return 'Project name is required';

        // Basic validation for npm package names
        if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(input.trim())) {
          return 'Project name must be a valid npm package name (lowercase, alphanumeric, dashes, dots, underscores)';
        }

        return true;
      },
    });
  }

  if (!options.template) {
    prompts.push({
      name: 'template',
      type: 'list',
      message: 'Choose a template:',
      choices: [
        {
          name: 'Blank - Minimal starter template',
          value: 'blank',
          short: 'Blank',
        },
      ],
      default: 'blank',
    });
  }

  if (!options.styling) {
    prompts.push({
      name: 'styling',
      type: 'list',
      message: 'Which CSS solution would you like?',
      choices: [
        { name: 'Plain CSS (recommended for beginners)', value: 'css' },
        { name: 'Sass/SCSS', value: 'sass' },
        { name: 'Tailwind CSS', value: 'tailwind' },
      ],
      default: 'css',
    });
  }

  if (options.gitInit === undefined) {
    prompts.push({
      name: 'gitInit',
      type: 'confirm',
      message: 'Initialize a git repository?',
      default: true,
    });
  }

  if (options.install === undefined) {
    prompts.push({
      name: 'install',
      type: 'confirm',
      message: 'Install dependencies?',
      default: true,
    });
  }

  const answers = prompts.length > 0 ? await inquirer.prompt(prompts) : {};

  // Determine if we should install dependencies
  const shouldInstall =
    options.install !== undefined
      ? options.install
      : answers.install !== undefined
        ? answers.install
        : true;

  // If we're installing and no package manager was specified
  if (shouldInstall && !options.packageManager) {
    const availableManagers = await detectAvailablePackageManagers();

    // Only prompt for package manager if we're in interactive mode (had prompts)
    if (prompts.length > 0 && availableManagers.length > 1) {
      const pmAnswer = await inquirer.prompt([
        {
          name: 'packageManager',
          type: 'list',
          message: 'Which package manager would you like to use?',
          choices: availableManagers.map((pm) => ({
            name: pm,
            value: pm,
          })),
          default: availableManagers[0],
        },
      ]);
      options.packageManager = pmAnswer.packageManager;
    } else if (prompts.length > 0 && availableManagers.length === 1) {
      // Interactive mode with only one manager: use it
      const manager = availableManagers[0];
      if (manager) {
        options.packageManager = manager;
      }
    } else {
      // Non-interactive mode: always default to npm
      options.packageManager = 'npm';
    }
  }

  const createOptions: CreateOptions = {
    projectName: options.projectName || answers.name?.trim() || 'my-stati-site',
    template: options.template || answers.template || 'blank',
    styling: options.styling || answers.styling || 'css',
    gitInit:
      options.gitInit !== undefined
        ? options.gitInit
        : answers.gitInit !== undefined
          ? answers.gitInit
          : true,
    install: shouldInstall,
    ...(options.packageManager && { packageManager: options.packageManager }),
  };

  console.log(colors.highlight('Creating Stati project...'));

  try {
    const result = await createSite(createOptions);

    console.log(colors.success(`✅ Successfully created Stati project '${result.projectName}'`));

    // Display next steps
    console.log(colors.warning('\nNext steps:'));
    console.log(`  cd ${result.projectName}`);
    if (!createOptions.install) {
      console.log('  npm install');
    }
    console.log('  npm run dev');
    console.log('\n🌟 Happy building with Stati!');
  } catch (error) {
    console.error(colors.error('❌ Failed to create Stati site'));
    console.error(colors.error(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

// Main execution when run directly
async function main(): Promise<void> {
  const cliOptions = await parseArgs();
  await runCLI(cliOptions);
}

// Only run when this file is executed directly (not imported)
if (
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')))
) {
  main().catch((err: unknown) => {
    console.error(colors.error('An error occurred:'), err);
    process.exit(1);
  });
}
