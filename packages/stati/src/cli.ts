#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

async function build(opts: { force?: boolean; clean?: boolean }) {
  // stub for now – just to validate wiring
  console.log('stati build', opts);
}
async function invalidate(query?: string) {
  console.log('stati invalidate', query);
}

yargs(hideBin(process.argv))
  .scriptName('stati')
  .command(
    'build',
    'Build site',
    (y) => y.option('force', { type: 'boolean' }).option('clean', { type: 'boolean' }),
    async (argv) => {
      await build({ force: !!argv.force, clean: !!argv.clean });
    },
  )
  .command(
    'invalidate [query]',
    'Invalidate by tag= or path=',
    (y) => y.positional('query', { type: 'string' }),
    async (argv) => {
      await invalidate(argv.query as string | undefined);
    },
  )
  .demandCommand(1)
  .help()
  .parse();
