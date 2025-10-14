import { describe, it, expect } from 'vitest';
import {
  findNode,
  getChildren,
  getParent,
  getSiblings,
  getSubtree,
  getBreadcrumbs,
  getCurrentNode,
  createNavigationHelpers,
} from '../../src/core/utils/navigation-helpers.js';
import type { NavNode, PageModel } from '../../src/types/index.js';

describe('Navigation Helpers', () => {
  // Sample navigation tree for testing
  const mockNavTree: NavNode[] = [
    {
      title: 'Home',
      url: '/',
      path: '/',
      order: 1,
    },
    {
      title: 'About',
      url: '/about',
      path: '/about',
      order: 2,
    },
    {
      title: 'Blog',
      url: '/blog',
      path: '/blog',
      order: 3,
      isCollection: true,
      children: [
        {
          title: 'Post 1',
          url: '/blog/post-1',
          path: '/blog/post-1',
          order: 1,
        },
        {
          title: 'Post 2',
          url: '/blog/post-2',
          path: '/blog/post-2',
          order: 2,
        },
      ],
    },
    {
      title: 'Docs',
      url: '/docs',
      path: '/docs',
      order: 4,
      isCollection: true,
      children: [
        {
          title: 'Getting Started',
          url: '/docs/getting-started',
          path: '/docs/getting-started',
          order: 1,
          children: [
            {
              title: 'Installation',
              url: '/docs/getting-started/installation',
              path: '/docs/getting-started/installation',
              order: 1,
            },
            {
              title: 'Quick Start',
              url: '/docs/getting-started/quick-start',
              path: '/docs/getting-started/quick-start',
              order: 2,
            },
          ],
        },
        {
          title: 'API',
          url: '/docs/api',
          path: '/docs/api',
          order: 2,
        },
      ],
    },
  ];

  describe('findNode', () => {
    it('should find a top-level node by path', () => {
      const node = findNode(mockNavTree, '/about');
      expect(node).toBeDefined();
      expect(node?.title).toBe('About');
    });

    it('should find a nested node by path', () => {
      const node = findNode(mockNavTree, '/blog/post-1');
      expect(node).toBeDefined();
      expect(node?.title).toBe('Post 1');
    });

    it('should find a deeply nested node', () => {
      const node = findNode(mockNavTree, '/docs/getting-started/installation');
      expect(node).toBeDefined();
      expect(node?.title).toBe('Installation');
    });

    it('should return undefined for non-existent path', () => {
      const node = findNode(mockNavTree, '/non-existent');
      expect(node).toBeUndefined();
    });

    it('should find node by URL', () => {
      const node = findNode(mockNavTree, '/docs/api');
      expect(node).toBeDefined();
      expect(node?.title).toBe('API');
    });
  });

  describe('getChildren', () => {
    it('should return children of a node', () => {
      const children = getChildren(mockNavTree, '/blog');
      expect(children).toHaveLength(2);
      expect(children[0]?.title).toBe('Post 1');
      expect(children[1]?.title).toBe('Post 2');
    });

    it('should return nested children', () => {
      const children = getChildren(mockNavTree, '/docs/getting-started');
      expect(children).toHaveLength(2);
      expect(children[0]?.title).toBe('Installation');
      expect(children[1]?.title).toBe('Quick Start');
    });

    it('should return empty array if node has no children', () => {
      const children = getChildren(mockNavTree, '/about');
      expect(children).toEqual([]);
    });

    it('should return empty array if node not found', () => {
      const children = getChildren(mockNavTree, '/non-existent');
      expect(children).toEqual([]);
    });
  });

  describe('getParent', () => {
    it('should return parent of a nested node', () => {
      const parent = getParent(mockNavTree, '/blog/post-1');
      expect(parent).toBeDefined();
      expect(parent?.title).toBe('Blog');
      expect(parent?.url).toBe('/blog');
    });

    it('should return parent of a deeply nested node', () => {
      const parent = getParent(mockNavTree, '/docs/getting-started/installation');
      expect(parent).toBeDefined();
      expect(parent?.title).toBe('Getting Started');
      expect(parent?.url).toBe('/docs/getting-started');
    });

    it('should return undefined for top-level nodes', () => {
      const parent = getParent(mockNavTree, '/about');
      expect(parent).toBeUndefined();
    });

    it('should return undefined for non-existent nodes', () => {
      const parent = getParent(mockNavTree, '/non-existent');
      expect(parent).toBeUndefined();
    });
  });

  describe('getSiblings', () => {
    it('should return siblings excluding self by default', () => {
      const siblings = getSiblings(mockNavTree, '/blog/post-1');
      expect(siblings).toHaveLength(1);
      expect(siblings[0]?.title).toBe('Post 2');
    });

    it('should include self when requested', () => {
      const siblings = getSiblings(mockNavTree, '/blog/post-1', true);
      expect(siblings).toHaveLength(2);
      expect(siblings.some((s) => s.title === 'Post 1')).toBe(true);
      expect(siblings.some((s) => s.title === 'Post 2')).toBe(true);
    });

    it('should return top-level siblings', () => {
      const siblings = getSiblings(mockNavTree, '/about');
      expect(siblings.length).toBeGreaterThan(0);
      expect(siblings.some((s) => s.title === 'Home')).toBe(true);
      expect(siblings.some((s) => s.title === 'Blog')).toBe(true);
      expect(siblings.some((s) => s.title === 'About')).toBe(false); // Excluding self
    });

    it('should return empty array for nodes without siblings', () => {
      const siblings = getSiblings(mockNavTree, '/docs/api');
      expect(siblings).toHaveLength(1);
      expect(siblings[0]?.title).toBe('Getting Started');
    });
  });

  describe('getSubtree', () => {
    it('should return subtree for a node', () => {
      const subtree = getSubtree(mockNavTree, '/blog');
      expect(subtree).toHaveLength(1);
      expect(subtree[0]?.title).toBe('Blog');
      expect(subtree[0]?.children).toHaveLength(2);
    });

    it('should return subtree for deeply nested node', () => {
      const subtree = getSubtree(mockNavTree, '/docs/getting-started');
      expect(subtree).toHaveLength(1);
      expect(subtree[0]?.title).toBe('Getting Started');
      expect(subtree[0]?.children).toHaveLength(2);
    });

    it('should return empty array if node not found', () => {
      const subtree = getSubtree(mockNavTree, '/non-existent');
      expect(subtree).toEqual([]);
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return breadcrumb trail for nested page', () => {
      const breadcrumbs = getBreadcrumbs(mockNavTree, '/blog/post-1');
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]?.title).toBe('Blog');
      expect(breadcrumbs[1]?.title).toBe('Post 1');
    });

    it('should return breadcrumb trail for deeply nested page', () => {
      const breadcrumbs = getBreadcrumbs(mockNavTree, '/docs/getting-started/installation');
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]?.title).toBe('Docs');
      expect(breadcrumbs[1]?.title).toBe('Getting Started');
      expect(breadcrumbs[2]?.title).toBe('Installation');
    });

    it('should return single item for top-level page', () => {
      const breadcrumbs = getBreadcrumbs(mockNavTree, '/about');
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]?.title).toBe('About');
    });

    it('should return empty array for non-existent page', () => {
      const breadcrumbs = getBreadcrumbs(mockNavTree, '/non-existent');
      expect(breadcrumbs).toEqual([]);
    });
  });

  describe('getCurrentNode', () => {
    it('should find current node from page model', () => {
      const page: PageModel = {
        slug: 'post-1',
        url: '/blog/post-1',
        sourcePath: '/content/blog/post-1.md',
        frontMatter: { title: 'Post 1' },
        content: '<p>Content</p>',
      };

      const node = getCurrentNode(mockNavTree, page);
      expect(node).toBeDefined();
      expect(node?.title).toBe('Post 1');
    });

    it('should return undefined if page not in navigation', () => {
      const page: PageModel = {
        slug: 'non-existent',
        url: '/non-existent',
        sourcePath: '/content/non-existent.md',
        frontMatter: { title: 'Non-existent' },
        content: '<p>Content</p>',
      };

      const node = getCurrentNode(mockNavTree, page);
      expect(node).toBeUndefined();
    });
  });

  describe('createNavigationHelpers', () => {
    const mockPage: PageModel = {
      slug: 'post-1',
      url: '/blog/post-1',
      sourcePath: '/content/blog/post-1.md',
      frontMatter: { title: 'Post 1' },
      content: '<p>Content</p>',
    };

    it('should create helpers object with tree property', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      expect(helpers.tree).toBe(mockNavTree);
    });

    it('should create getTree method', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      expect(helpers.getTree()).toBe(mockNavTree);
    });

    it('should create findNode method', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const node = helpers.findNode('/about');
      expect(node?.title).toBe('About');
    });

    it('should create getChildren method', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const children = helpers.getChildren('/blog');
      expect(children).toHaveLength(2);
    });

    it('should create getParent method with default to current page', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const parent = helpers.getParent();
      expect(parent?.title).toBe('Blog');
    });

    it('should create getParent method with custom path', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const parent = helpers.getParent('/docs/getting-started/installation');
      expect(parent?.title).toBe('Getting Started');
    });

    it('should create getSiblings method with default to current page', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const siblings = helpers.getSiblings();
      expect(siblings).toHaveLength(1);
      expect(siblings[0]?.title).toBe('Post 2');
    });

    it('should create getSiblings method with custom path', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const siblings = helpers.getSiblings('/docs/getting-started');
      expect(siblings).toHaveLength(1);
      expect(siblings[0]?.title).toBe('API');
    });

    it('should create getSubtree method', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const subtree = helpers.getSubtree('/docs');
      expect(subtree).toHaveLength(1);
      expect(subtree[0]?.title).toBe('Docs');
    });

    it('should create getBreadcrumbs method with default to current page', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const breadcrumbs = helpers.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]?.title).toBe('Blog');
      expect(breadcrumbs[1]?.title).toBe('Post 1');
    });

    it('should create getBreadcrumbs method with custom path', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const breadcrumbs = helpers.getBreadcrumbs('/docs/getting-started/installation');
      expect(breadcrumbs).toHaveLength(3);
    });

    it('should create getCurrentNode method', () => {
      const helpers = createNavigationHelpers(mockNavTree, mockPage);
      const node = helpers.getCurrentNode();
      expect(node?.title).toBe('Post 1');
    });
  });
});
