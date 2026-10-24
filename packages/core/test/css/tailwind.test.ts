/**
 * Tests for finding and running the Tailwind CSS CLI.
 * @module css/tailwind.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { findTailwindCli, runTailwindCLI } from '../../src/css/tailwind.js';

describe('Tailwind CSS CLI', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-tailwind-cli-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function write(path: string, content: string): Promise<void> {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }

  describe('findTailwindCli', () => {
    it("finds Tailwind CSS 4's CLI in @tailwindcss/cli", async () => {
      await write(
        'node_modules/@tailwindcss/cli/package.json',
        JSON.stringify({ bin: { tailwindcss: './dist/index.mjs' } }),
      );
      // Tailwind CSS 4's own package ships no CLI
      await write('node_modules/tailwindcss/package.json', JSON.stringify({ version: '4.0.0' }));

      expect(await findTailwindCli(root)).toBe(
        join(root, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs'),
      );
    });

    it("finds Tailwind CSS 3's CLI in tailwindcss", async () => {
      await write(
        'node_modules/tailwindcss/package.json',
        JSON.stringify({ bin: { tailwind: 'lib/cli.js', tailwindcss: 'lib/cli.js' } }),
      );

      expect(await findTailwindCli(root)).toBe(
        join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
      );
    });

    it('accepts a bin given as a string', async () => {
      await write(
        'node_modules/@tailwindcss/cli/package.json',
        JSON.stringify({ bin: './cli.js' }),
      );

      expect(await findTailwindCli(root)).toBe(
        join(root, 'node_modules', '@tailwindcss', 'cli', 'cli.js'),
      );
    });

    it('looks in the folders above the project, nearest first', async () => {
      await write(
        'node_modules/@tailwindcss/cli/package.json',
        JSON.stringify({ bin: { tailwindcss: './root.mjs' } }),
      );
      await mkdir(join(root, 'apps', 'site'), { recursive: true });
      expect(await findTailwindCli(join(root, 'apps', 'site'))).toBe(
        join(root, 'node_modules', '@tailwindcss', 'cli', 'root.mjs'),
      );

      await write(
        'apps/node_modules/@tailwindcss/cli/package.json',
        JSON.stringify({ bin: { tailwindcss: './nearer.mjs' } }),
      );
      expect(await findTailwindCli(join(root, 'apps', 'site'))).toBe(
        join(root, 'apps', 'node_modules', '@tailwindcss', 'cli', 'nearer.mjs'),
      );
    });

    it('skips a package whose bin has no tailwindcss entry', async () => {
      await write(
        'node_modules/@tailwindcss/cli/package.json',
        JSON.stringify({ bin: { tailwind: './cli.js' } }),
      );

      expect(await findTailwindCli(root)).toBeNull();
    });

    it('skips a package.json it cannot read', async () => {
      await write('node_modules/@tailwindcss/cli/package.json', '{ not json');
      await write(
        'node_modules/tailwindcss/package.json',
        JSON.stringify({ bin: { tailwindcss: 'lib/cli.js' } }),
      );

      expect(await findTailwindCli(root)).toBe(
        join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
      );
    });
  });

  describe('runTailwindCLI', () => {
    async function installCli(script: string): Promise<void> {
      await write(
        'node_modules/@tailwindcss/cli/package.json',
        JSON.stringify({ bin: { tailwindcss: './cli.cjs' } }),
      );
      await write('node_modules/@tailwindcss/cli/cli.cjs', script);
    }

    it('runs the CLI with the input, output and --minify from the project root', async () => {
      await installCli(`const fs = require('node:fs');
fs.writeFileSync('args.json', JSON.stringify(process.argv.slice(2)));
fs.writeFileSync(process.argv[5], 'out');
`);
      await write('src/styles.css', '');

      await runTailwindCLI({
        projectRoot: root,
        input: 'src/styles.css',
        output: join(root, 'out dir.css'),
        minify: true,
      });

      expect(JSON.parse(await readFile(join(root, 'args.json'), 'utf-8'))).toEqual([
        '-i',
        'src/styles.css',
        '-o',
        join(root, 'out dir.css'),
        '--minify',
      ]);
      expect(await readFile(join(root, 'out dir.css'), 'utf-8')).toBe('out');
    });

    it("reports Tailwind's error without colors, banner, timing or box lines", async () => {
      await installCli(`process.stderr.write(
  '\\u001b[2m≈ tailwindcss v4.1.0\\u001b[22m\\n\\n' +
  '\\u001b[31mError:\\u001b[39m\\n\\u001b[2m┌\\u001b[22m\\n' +
  '\\u001b[2m│\\u001b[22m Error: Cannot apply unknown utility class \`nope\`\\n' +
  '\\u001b[2m└\\u001b[22m\\nDone in \\u001b[31m3ms\\u001b[39m\\n'
);
process.exit(1);
`);

      await expect(
        runTailwindCLI({ projectRoot: root, input: 'in.css', output: 'out.css', minify: false }),
      ).rejects.toThrow(
        new Error(
          'Tailwind CSS exited with code 1:\nError: Cannot apply unknown utility class `nope`',
        ),
      );
    });

    it('reports what Tailwind printed to stdout, and only the exit code without output', async () => {
      const run = () =>
        runTailwindCLI({ projectRoot: root, input: 'in.css', output: 'out.css', minify: false });

      await installCli(`process.stdout.write('Error: printed to stdout\\n');
process.exit(2);
`);
      await expect(run()).rejects.toThrow(
        new Error('Tailwind CSS exited with code 2:\nError: printed to stdout'),
      );

      await installCli('process.exit(3);\n');
      await expect(run()).rejects.toThrow(new Error('Tailwind CSS exited with code 3'));
    });

    it('explains how to install Tailwind CSS when it is missing', async () => {
      await expect(
        runTailwindCLI({ projectRoot: root, input: 'in.css', output: 'out.css', minify: false }),
      ).rejects.toThrow('npm install -D tailwindcss @tailwindcss/cli');
    });
  });
});
