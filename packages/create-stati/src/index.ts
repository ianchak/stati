#!/usr/bin/env node
import inquirer from 'inquirer';
import pc from 'picocolors';
import { SingleBar, Presets } from 'cli-progress';
import { createSite } from './create.js';
import type { CreateOptions } from './create.js';

async function parseArgs(): Promise<Partial<CreateOptions> | null> {
  const args = process.argv.slice(2);

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

async function run() {
  const cliOptions = await parseArgs();

  if (cliOptions === null) {
    return; // Help was shown
  }

  console.log(pc.bold(pc.blue('🚀 Welcome to Stati')));
  console.log(pc.dim('Create a new static site with Stati\n'));

  // Determine what prompts we need based on CLI args
  const prompts = [];

  if (!cliOptions.projectName) {
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

  if (!cliOptions.template) {
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

  if (!cliOptions.styling) {
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

  if (cliOptions.gitInit === undefined) {
    prompts.push({
      name: 'gitInit',
      type: 'confirm',
      message: 'Initialize a git repository?',
      default: true,
    });
  }

  if (cliOptions.installDependencies === undefined) {
    prompts.push({
      name: 'install',
      type: 'confirm',
      message: 'Install dependencies now?',
      default: true,
    });
  }

  const answers = prompts.length > 0 ? await inquirer.prompt(prompts) : {};

  const createOptions: CreateOptions = {
    projectName: cliOptions.projectName || answers.name?.trim() || 'my-stati-site',
    template: cliOptions.template || answers.template || 'blank',
    styling: cliOptions.styling || answers.styling || 'css',
    gitInit:
      cliOptions.gitInit !== undefined
        ? cliOptions.gitInit
        : answers.gitInit !== undefined
          ? answers.gitInit
          : true,
    installDependencies:
      cliOptions.installDependencies !== undefined
        ? cliOptions.installDependencies
        : answers.install !== undefined
          ? answers.install
          : true,
  };

  const bar = new SingleBar(
    {
      format: `${pc.cyan('Scaffolding')} |{bar}| {percentage}% | {value}/{total}`,
      hideCursor: true,
      clearOnComplete: true,
    },
    Presets.shades_classic,
  );

  // Start progress bar with estimated steps
  bar.start(4, 0);

  try {
    // Step 1: Create project structure
    bar.increment();
    const result = await createSite(createOptions);

    // Step 2: Process styling
    bar.increment();

    // Step 3: Initialize git (if requested)
    bar.increment();

    // Step 4: Complete
    bar.increment();

    bar.stop();

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
    bar.stop();
    console.error(pc.red('❌ Failed to create Stati site'));
    console.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(pc.red('An error occurred:'), err);
  process.exit(1);
});
