/**
 * Template changes in a real dev server: a real file watcher and real builds of a temporary
 * site. Pages record the templates they rendered and the names they looked up, so a change
 * rebuilds only the pages it affects, and a template no page uses rebuilds nothing.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { createDevServer } from '../../src/core/dev.js';
import { setEnv } from '../../src/env.js';

const PORT = 4613;
const HOST = '127.0.0.1';

function status(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    get(`http://${HOST}:${PORT}${path}`, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    }).on('error', reject);
  });
}

describe('dev server template changes', { timeout: 20000 }, () => {
  let dir: string;
  let cwd: string;
  let server: Awaited<ReturnType<typeof createDevServer>>;
  const lines: string[] = [];
  const noop = () => {};
  const logger = {
    info: (message?: string) => lines.push(String(message)),
    success: noop,
    warning: noop,
    error: (message?: string) => lines.push(`ERROR ${String(message)}`),
    status: noop,
    building: noop,
    processing: noop,
    stats: noop,
  };

  const write = (path: string, content: string) => {
    const file = join(dir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  const read = (path: string) => readFileSync(join(dir, path), 'utf-8');

  /**
   * Applies a change and waits for the dev server to report it: the line naming the file and
   * the line after it, or a failed rebuild.
   */
  async function change(file: string, apply: () => void): Promise<string[]> {
    const start = lines.length;
    apply();
    for (let attempt = 0; attempt < 400; attempt++) {
      const reported = lines.slice(start);
      const index = reported.findIndex((line) => line.startsWith(`▸ ${file} `));
      const failed = reported.some((line) => line.startsWith('ERROR × Rebuild failed'));
      if ((index !== -1 && reported[index + 1] !== undefined) || failed) {
        // Let a second watcher event for the same write settle before the next step
        await sleep(200);
        return lines.slice(start);
      }
      await sleep(25);
    }
    throw new Error(`No rebuild reported for ${file}:\n${lines.slice(start).join('\n')}`);
  }

  beforeAll(async () => {
    dir = join(tmpdir(), `stati-dev-templates-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    write(
      'stati.config.js',
      "export default { site: { title: 'Dev', baseUrl: 'https://example.com' }, seo: { autoInject: false } };\n",
    );
    write(
      'site/base.eta',
      `<html><head></head><body><%~ stati.include('partials/header') %><%~ stati.body %></body></html>`,
    );
    write('site/layout.eta', `<% stati.layout('base') %><main><%~ stati.content %></main>`);
    write(
      'site/blog/layout.eta',
      `<% stati.layout('base') %><article><%~ stati.content %></article>`,
    );
    write('site/partials/header.eta', '<header>Site</header>');
    write('site/partials/unused.eta', 'unused');
    write('site/index.md', '---\ntitle: Home\n---\nHome');
    write('site/blog/first.md', '---\ntitle: First\n---\nFirst');
    write('site/blog/second.md', '---\ntitle: Second\n---\nSecond');
    mkdirSync(join(dir, 'public'), { recursive: true });

    cwd = process.cwd();
    process.chdir(dir);
    setEnv('development');
    server = await createDevServer({ port: PORT, host: HOST, logger });
    await server.start();
    // Let the watcher finish its first scan before files change
    await sleep(500);
  }, 30000);

  afterAll(async () => {
    await server?.stop();
    process.chdir(cwd);
    setEnv('test');
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it('rebuilds only the pages that rendered a changed template', async () => {
    const reported = await change('site/blog/layout.eta', () =>
      write(
        'site/blog/layout.eta',
        `<% stati.layout('base') %><article class="v2"><%~ stati.content %></article>`,
      ),
    );

    expect(reported).toContainEqual('▸ site/blog/layout.eta changed');
    expect(reported).toContainEqual(expect.stringMatching(/^ {3}2\/3 pages rebuilt in \d+ms$/));
    expect(read('dist/blog/first.html')).toContain('<article class="v2">');
  });

  it('rebuilds nothing when a template no page uses changes', async () => {
    const before = read('dist/index.html');
    const reported = await change('site/partials/unused.eta', () =>
      write('site/partials/unused.eta', 'still unused'),
    );

    expect(reported).toContainEqual('▸ site/partials/unused.eta changed');
    expect(reported).toContainEqual('   No page uses it');
    expect(read('dist/index.html')).toBe(before);
  });

  it('rebuilds only the pages a new section override applies to', async () => {
    const reported = await change('site/blog/partials/header.eta', () =>
      write('site/blog/partials/header.eta', '<header>Blog</header>'),
    );

    expect(reported).toContainEqual('▸ site/blog/partials/header.eta added');
    expect(reported).toContainEqual(expect.stringMatching(/^ {3}2\/3 pages rebuilt in \d+ms$/));
    expect(read('dist/blog/second.html')).toContain('<header>Blog</header>');
    expect(read('dist/index.html')).toContain('<header>Site</header>');
  });

  it('rebuilds the pages that used a deleted template', async () => {
    const reported = await change('site/blog/partials/header.eta', () =>
      unlinkSync(join(dir, 'site/blog/partials/header.eta')),
    );

    expect(reported).toContainEqual('▸ site/blog/partials/header.eta deleted');
    expect(reported).toContainEqual(expect.stringMatching(/^ {3}2\/3 pages rebuilt in \d+ms$/));
    expect(read('dist/blog/first.html')).toContain('<header>Site</header>');
  });

  it('records an edit that adds an include, so editing the new include rebuilds the page', async () => {
    await change('site/layout.eta', () =>
      write(
        'site/layout.eta',
        `<% stati.layout('base') %><main><%~ stati.include('partials/note') %><%~ stati.content %></main>`,
      ),
    );
    // The note does not exist yet: the overlay shows the error
    expect(lines.some((line) => line.includes("stati.include('partials/note')"))).toBe(true);
    expect(await status('/')).toBe(500);

    // Adding it clears the error, though no recorded page used it before the failed build
    const added = await change('site/partials/note.eta', () =>
      write('site/partials/note.eta', '<p>Note v1</p>'),
    );
    expect(added).toContainEqual('▸ site/partials/note.eta added');
    expect(await status('/')).toBe(200);
    expect(read('dist/index.html')).toContain('<p>Note v1</p>');

    const edited = await change('site/partials/note.eta', () =>
      write('site/partials/note.eta', '<p>Note v2</p>'),
    );
    expect(edited).toContainEqual(expect.stringMatching(/^ {3}1\/3 pages rebuilt in \d+ms$/));
    expect(read('dist/index.html')).toContain('<p>Note v2</p>');
  });
});
