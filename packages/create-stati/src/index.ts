#!/usr/bin/env node
import inquirer from 'inquirer';
import pc from 'picocolors';
import { createSite } from './create.js';
import type { CreateOptions } from './create.js';

export async function parseArgs(
  args: string[] = process.argv.slice(2),
): Promise<Partial<CreateOptions> | null> {
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`${pc.bold('create-stati')} - Create a new Stati static site

Usage:
  create-stati [project-name] [options]

Options:
  --template <name>        Template to use (blank)
  --styling <type>         CSS solution (css|sass|tailwind)
  --git                    Initialize git repository
  --no-git                 Skip git initialization
  --install                Install dependencies
  --no-install             Skip dependency installation
  --help, -h               Show this help message

Examples:
  create-stati my-site
  create-stati my-blog --styling=sass --git
  create-stati my-app --template=blank --styling=tailwind --no-install
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
        case 'git':
          options.gitInit = true;
          break;
        case 'no-git':
          options.gitInit = false;
          break;
        case 'install':
          options.installDependencies = true;
          break;
        case 'no-install':
          options.installDependencies = false;
          break;
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

  console.log(pc.bold(pc.blue('🚀 Welcome to Stati')));
  console.log(pc.dim('Create a new static site with Stati\n'));

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

  if (options.installDependencies === undefined) {
    prompts.push({
      name: 'install',
      type: 'confirm',
      message: 'Install dependencies now?',
      default: true,
    });
  }

  const answers = prompts.length > 0 ? await inquirer.prompt(prompts) : {};

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
    installDependencies:
      options.installDependencies !== undefined
        ? options.installDependencies
        : answers.install !== undefined
          ? answers.install
          : true,
  };

  console.log(pc.cyan('🚀 Creating Stati project...'));

  try {
    const result = await createSite(createOptions);

    console.log(pc.green(`✨ Successfully created Stati project '${result.projectName}'`));

    // Display next steps
    console.log(pc.yellow('\n📝 Next steps:'));
    console.log(`  cd ${result.projectName}`);
    if (!createOptions.installDependencies) {
      console.log('  npm install');
    }
    console.log('  npm run dev');
    console.log('\n🌟 Happy building with Stati!');
  } catch (error) {
    console.error(pc.red('❌ Failed to create Stati site'));
    console.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

// Main execution when run directly
async function main(): Promise<void> {
  const cliOptions = await parseArgs();
  await runCLI(cliOptions);
}

// Always run when this file is executed (not imported)
main().catch((err: unknown) => {
  console.error(pc.red('An error occurred:'), err);
  process.exit(1);
});
