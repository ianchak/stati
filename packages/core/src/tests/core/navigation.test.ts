import { describe, it, expect } from 'vitest';
import { buildNavigation } from '../../core/navigation.js';
import type { PageModel } from '../../types/index.js';

describe('Navigation', () => {
  const mockPages: PageModel[] = [
    {
      slug: '/',
      url: '/',
      sourcePath: '/content/index.md',
      frontMatter: { title: 'Home', order: 1 },
      content: '# Welcome',
    },
    {
      slug: '/about',
      url: '/about',
      sourcePath: '/content/about.md',
      frontMatter: { title: 'About', order: 2 },
      content: '# About us',
    },
    {
      slug: '/blog/post-1',
      url: '/blog/post-1',
      sourcePath: '/content/blog/post-1.md',
      frontMatter: { title: 'First Post', order: 2 },
      content: '# First post',
      publishedAt: new Date('2024-01-01'),
    },
    {
      slug: '/blog/post-2',
      url: '/blog/post-2',
      sourcePath: '/content/blog/post-2.md',
      frontMatter: { title: 'Second Post', order: 1 },
      content: '# Second post',
      publishedAt: new Date('2024-01-02'),
    },
    {
      slug: '/blog',
      url: '/blog',
      sourcePath: '/content/blog/index.md',
      frontMatter: { title: 'Blog Index' },
      content: '# Blog',
    },
  ];

  it('should build navigation structure correctly', () => {
    const navigation = buildNavigation(mockPages);

    expect(navigation).toHaveLength(3); // home, about, blog collection

    // Check root level pages
    const homePage = navigation.find((n) => n.url === '/');
    expect(homePage).toEqual({
      title: 'Home',
      url: '/',
      path: '/',
      order: 1,
      publishedAt: undefined,
      isCollection: false,
    });

    const aboutPage = navigation.find((n) => n.url === '/about');
    expect(aboutPage).toEqual({
      title: 'About',
      url: '/about',
      path: '/about',
      order: 2,
      publishedAt: undefined,
      isCollection: false,
    });

    // Check blog collection
    const blogCollection = navigation.find((n) => n.path === '/blog');
    expect(blogCollection?.title).toBe('Blog Index');
    expect(blogCollection?.url).toBe('/blog');
    expect(blogCollection?.isCollection).toBe(true);
    expect(blogCollection?.children).toHaveLength(2);
  });

  it('should sort pages correctly within collections', () => {
    const navigation = buildNavigation(mockPages);
    const blogCollection = navigation.find((n) => n.path === '/blog');
    expect(blogCollection?.children).toBeDefined();
    const children = blogCollection!.children!;

    // Ensure we have the expected number of children
    expect(children).toHaveLength(2);

    // Should be sorted by order field (1, 2)
    expect(children[0]?.title).toBe('Second Post');
    expect(children[0]?.order).toBe(1);
    expect(children[1]?.title).toBe('First Post');
    expect(children[1]?.order).toBe(2);
  });

  it('should handle pages without titles', () => {
    const pagesWithoutTitle: PageModel[] = [
      {
        slug: '/untitled',
        url: '/untitled',
        sourcePath: '/content/untitled.md',
        frontMatter: {},
        content: '# Content',
      },
    ];

    const navigation = buildNavigation(pagesWithoutTitle);
    expect(navigation).toHaveLength(1);
    expect(navigation[0]?.title).toBe('untitled'); // derived from URL
  });

  it('should handle empty pages array', () => {
    const navigation = buildNavigation([]);
    expect(navigation).toEqual([]);
  });

  it('should group deeply nested pages correctly', () => {
    const deepPages: PageModel[] = [
      {
        slug: '/docs/guide/getting-started',
        url: '/docs/guide/getting-started',
        sourcePath: '/content/docs/guide/getting-started.md',
        frontMatter: { title: 'Getting Started' },
        content: '# Getting Started',
      },
      {
        slug: '/docs/guide',
        url: '/docs/guide',
        sourcePath: '/content/docs/guide/index.md',
        frontMatter: { title: 'Guide' },
        content: '# Guide',
      },
    ];

    const navigation = buildNavigation(deepPages);

    // Based on the algorithm:
    // /docs/guide/getting-started belongs to /docs/guide collection
    // /docs/guide belongs to /docs collection
    // So we get two collections: /docs and /docs/guide
    expect(navigation).toHaveLength(2);

    const docsCollection = navigation.find((n) => n.path === '/docs');
    const docsGuideCollection = navigation.find((n) => n.path === '/docs/guide');

    expect(docsCollection?.title).toBe('Docs'); // From collection name since no index page
    expect(docsGuideCollection?.title).toBe('Guide'); // From index page frontmatter
    expect(docsGuideCollection?.children).toHaveLength(1);
    expect(docsGuideCollection?.children?.[0]?.title).toBe('Getting Started');
  });
});
