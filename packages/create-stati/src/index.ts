#!/usr/bin/env node
import inquirer from 'inquirer';
import { createSite } from './create.js';
import type { CreateOptions } from './create.js';

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
  --git                    Initialize git repository
  --no-git                 Skip git initialization
  --help, -h               Show this help message

Examples:
  create-stati my-site
  create-stati my-blog --styling=sass --git
  create-stati my-app --template=blank --styling=tailwind
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
  };

  console.log(colors.highlight('Creating Stati project...'));

  try {
    const result = await createSite(createOptions);

    console.log(colors.success(`✅ Successfully created Stati project '${result.projectName}'`));

    // Display next steps
    console.log(colors.warning('\nNext steps:'));
    console.log(`  cd ${result.projectName}`);
    console.log('  npm install');
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
