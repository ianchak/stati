#!/usr/bin/env node
import inquirer from 'inquirer';

async function run() {
  const answers = await inquirer.prompt([
    { name: 'name', message: 'Project name', default: 'my-site' },
    { name: 'template', type: 'list', choices: ['blog', 'docs', 'news'] },
    { name: 'tailwind', type: 'confirm', default: false },
  ]);
  console.log('Scaffold ->', answers);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
