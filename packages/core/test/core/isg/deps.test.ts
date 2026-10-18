import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import type { PageModel } from '../../../src/types/index.js';
import { resolveLayoutDependency } from '../../../src/core/isg/deps.js';
import { TemplateIndex } from '../../../src/core/template-index.js';

describe('resolveLayoutDependency', () => {
  const srcDir = join('/project', 'site');
  const posixSrcDir = srcDir.replace(/\\/g, '/');

  const page = (source: string, frontMatter: Record<string, unknown> = {}): PageModel => ({
    slug: source,
    url: `/${source.replace(/(\/?index)?\.md$/, '')}`,
    sourcePath: join(srcDir, ...source.split('/')),
    frontMatter,
    content: '',
  });

  const blogIndex = page('blog/index.md');
  const blogPost = page('blog/post.md');

  it('returns the root layout.eta for a regular page', () => {
    const index = new TemplateIndex(srcDir, ['layout.eta']);
    const about = page('about.md');

    expect(resolveLayoutDependency(about, [about], index)).toBe(`${posixSrcDir}/layout.eta`);
  });

  it("returns the section's layout.eta for pages in the section", () => {
    const index = new TemplateIndex(srcDir, ['layout.eta', 'blog/layout.eta']);

    expect(resolveLayoutDependency(blogPost, [blogPost], index)).toBe(
      `${posixSrcDir}/blog/layout.eta`,
    );
  });

  describe('nested collection index pages', () => {
    const index = new TemplateIndex(srcDir, ['layout.eta', 'blog/index.eta']);

    it('returns index.eta when the index page has child pages', () => {
      expect(resolveLayoutDependency(blogIndex, [blogIndex, blogPost], index)).toBe(
        `${posixSrcDir}/blog/index.eta`,
      );
    });

    it('returns layout.eta when the index page has no child pages', () => {
      expect(resolveLayoutDependency(blogIndex, [blogIndex], index)).toBe(
        `${posixSrcDir}/layout.eta`,
      );
    });

    it("prefers a nearer layout.eta over an ancestor's index.eta", () => {
      const nested = new TemplateIndex(srcDir, ['index.eta', 'blog/layout.eta']);
      expect(resolveLayoutDependency(blogIndex, [blogIndex, blogPost], nested)).toBe(
        `${posixSrcDir}/blog/layout.eta`,
      );
    });
  });

  it('looks up a front matter layout from the page folder, so a section file wins', () => {
    const index = new TemplateIndex(srcDir, ['layout.eta', 'post.eta', 'blog/post.eta']);
    const post = page('blog/post.md', { layout: 'post' });
    const rootPost = page('blog/post.md', { layout: '/post' });

    expect(resolveLayoutDependency(post, [post], index)).toBe(`${posixSrcDir}/blog/post.eta`);
    expect(resolveLayoutDependency(rootPost, [rootPost], index)).toBe(`${posixSrcDir}/post.eta`);
  });

  it('falls back to discovery when the front matter layout names no template', () => {
    const index = new TemplateIndex(srcDir, ['layout.eta']);
    const post = page('blog/post.md', { layout: 'missing' });

    expect(resolveLayoutDependency(post, [post], index)).toBe(`${posixSrcDir}/layout.eta`);
  });

  it('returns null when no layout file exists', () => {
    const index = new TemplateIndex(srcDir, ['partials/header.eta']);
    const about = page('about.md');

    expect(resolveLayoutDependency(about, [about], index)).toBeNull();
  });
});
