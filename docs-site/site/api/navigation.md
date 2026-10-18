---
title: 'Navigation'
description: Complete guide to Stati's navigation system and helper methods
order: 4
seo:
  title: 'Navigation API'
---

# Navigation

Stati automatically generates a navigation tree from your content and provides helper methods to query and traverse it in templates.

## Overview

The navigation system is available in all templates via the `stati.nav` object, which provides:

- **Full navigation tree** (`stati.nav.tree`)
- **Helper methods** for querying and traversing
- **Current page context** via `stati.page.navNode`

A page that reads `stati.nav` or `stati.page.navNode` depends on the navigation tree: when a page is added, removed or renamed, or its `order` or date changes, Stati rebuilds every page that read the tree, in `stati build` and in the dev server. Pages that don't read it stay cached. See [ISG](/core-concepts/isg#dependency-tracking).

Pages created from a `[param].md` template are left out of the tree unless the template sets `nav: true`, and the later pages of a paginated listing are always left out. See [Collections and generated pages](/core-concepts/collections).

## Navigation structure

### NavNode interface

Each navigation node has the following structure:

```typescript
interface NavNode {
  title: string;              // Front matter title, or the file/folder name
  url: string;                // URL path
  path: string;               // URL path of the page or collection folder
  order?: number;             // Sort order (from front matter)
  publishedAt?: Date;         // Publication date (quoted publishedAt front matter)
  children?: NavNode[];       // Pages in the collection (collection nodes only)
  isCollection?: boolean;     // True if this represents a folder
}
```

### Tree shape

The tree is shallow. Its top level holds:

- the pages directly in `site/` (including the home page `/`), and
- **one node for every folder that contains pages besides its `index.md`, at any depth**, with `isCollection: true`. A folder's `index.md` supplies the node's title, URL and `order`; without one, the title is the folder name with its first letter capitalized. A folder that holds only an `index.md` appears as an ordinary page node.

A collection node's `children` are the pages directly in that folder. A subfolder shows up there only as a page node for its `index.md`, with no `children`; the subfolder's own pages hang off the subfolder's top-level node. For this site structure:

```text
site/
├── index.md          (Home)
├── about.md          (About)
└── docs/
    ├── index.md      (Docs)
    ├── intro.md      (Intro)
    └── api/
        ├── index.md  (API)
        └── hooks.md  (Hooks)
```

`stati.nav.tree` is:

```text
About            /about
API              /docs/api   (collection) → Hooks
Docs             /docs       (collection) → API (page), Intro
Home             /
```

Nodes are sorted by `order`, then by title; pages inside a collection are sorted by `order`, then newest `publishedAt`, then title. To build a nested menu, look up each collection node on the top level of `stati.nav.tree`, or prepare the structure in a [build hook](/api/hooks).

> **Nested folders appear twice.** In the example, `/docs/api` is both a page node under Docs (no `children`) and a top-level collection node. `findNode()`, `getChildren()`, `getCurrentNode()` and `stati.page.navNode` return whichever of the two comes first in tree order, which depends on titles and `order`. To get a nested collection's pages reliably, use `stati.nav.tree.find((n) => n.isCollection && n.url === '/docs/api')?.children ?? []`. Top-level folders such as `/blog` are not affected.

## Navigation helpers

### `stati.nav.tree`

Direct access to the full navigation tree.

**Type:** `NavNode[]`

**Example:**

```html
<!-- Display top-level navigation -->
<nav>
  <% stati.nav.tree.forEach(node => { %>
    <a href="<%= node.url %>"><%= node.title %></a>
  <% }) %>
</nav>
```

---

### `stati.nav.getTree()`

Returns the complete navigation tree.

**Signature:**

```typescript
getTree(): NavNode[]
```

**Returns:** Array of top-level navigation nodes

**Example:**

```html
<% const navigation = stati.nav.getTree() %>
<ul>
  <% navigation.forEach(item => { %>
    <li><a href="<%= item.url %>"><%= item.title %></a></li>
  <% }) %>
</ul>
```

---

### `stati.nav.findNode(path)`

Finds a specific navigation node by path or URL.

**Signature:**

```typescript
findNode(path: string): NavNode | undefined
```

**Parameters:**

- `path` (string): Path or URL to find

**Returns:** The found node or `undefined`

**Example:**

```html
<% const docsNode = stati.nav.findNode('/docs') %>
<% if (docsNode) { %>
  <h3><%= docsNode.title %></h3>
  <p>This section has <%= docsNode.children?.length || 0 %> pages</p>
<% } %>
```

---

### `stati.nav.getChildren(path)`

Gets all child nodes of a specific path.

**Signature:**

```typescript
getChildren(path: string): NavNode[]
```

**Parameters:**

- `path` (string): Path of the parent node

**Returns:** Array of child navigation nodes (empty if not found or no children)

**Example:**

```html
<!-- Show all pages in the docs section -->
<div class="docs-listing">
  <h2>Documentation</h2>
  <ul>
    <% stati.nav.getChildren('/docs').forEach(page => { %>
      <li>
        <a href="<%= page.url %>"><%= page.title %></a>
      </li>
    <% }) %>
  </ul>
</div>
```

**Advanced Example - Nested Sidebar:**

```html
<!-- site/partials/sidebar.eta -->
<aside class="sidebar">
  <% function renderSection(path, title) { %>
    <div class="sidebar-section">
      <h3><%= title %></h3>
      <ul>
        <% stati.nav.getChildren(path).forEach(item => { %>
          <li>
            <a
              href="<%= item.url %>"
              class="<%= stati.page.url === item.url ? 'active' : '' %>"
            >
              <%= item.title %>
            </a>
          </li>
        <% }) %>
      </ul>
    </div>
  <% } %>

  <% renderSection('/getting-started', 'Getting Started') %>
  <% renderSection('/core-concepts', 'Core Concepts') %>
  <% renderSection('/api', 'API Reference') %>
</aside>
```

> **Call template functions with `<% %>`, not `<%~ %>`.** Markup inside a function defined in a template is written to the output as the function runs, and the function returns `undefined`. Calling it with `<%~ renderSection(...) %>` prints `undefined` and drops the section's markup.

---

### `stati.nav.getParent(path?)`

Gets the parent node of a specific path.

**Signature:**

```typescript
getParent(path?: string): NavNode | undefined
```

**Parameters:**

- `path` (string, optional): Path to find parent for. Defaults to current page.

**Returns:** The parent node or `undefined`

**Example:**

```html
<!-- Show "Back to Parent" link -->
<% const parent = stati.nav.getParent() %>
<% if (parent) { %>
  <a href="<%= parent.url %>" class="back-link">
    ← Back to <%= parent.title %>
  </a>
<% } %>
```

---

### `stati.nav.getSiblings(path?, includeSelf?)`

Gets sibling nodes (pages at the same level).

**Signature:**

```typescript
getSiblings(path?: string, includeSelf?: boolean): NavNode[]
```

**Parameters:**

- `path` (string, optional): Path to find siblings for. Defaults to current page.
- `includeSelf` (boolean, optional): Whether to include the current node. Default: `false`

**Returns:** Array of sibling nodes

**Example:**

```html
<!-- Show related pages (siblings) -->
<div class="related-pages">
  <h3>Related Pages</h3>
  <ul>
    <% stati.nav.getSiblings().forEach(sibling => { %>
      <li>
        <a href="<%= sibling.url %>"><%= sibling.title %></a>
      </li>
    <% }) %>
  </ul>
</div>
```

**Example with Prev/Next Navigation:**

```html
<!-- Previous/Next page navigation -->
<%
  const siblings = stati.nav.getSiblings(undefined, true);
  const currentIndex = siblings.findIndex(s => s.url === stati.page.url);
  const prevPage = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextPage = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
%>

<nav class="page-navigation">
  <% if (prevPage) { %>
    <a href="<%= prevPage.url %>" class="prev">
      ← <%= prevPage.title %>
    </a>
  <% } %>

  <% if (nextPage) { %>
    <a href="<%= nextPage.url %>" class="next">
      <%= nextPage.title %> →
    </a>
  <% } %>
</nav>
```

---

### `stati.nav.getSubtree(path)`

Gets a subtree starting from a specific path.

**Signature:**

```typescript
getSubtree(path: string): NavNode[]
```

**Parameters:**

- `path` (string): Root path for the subtree

**Returns:** Array containing the subtree (single node with its children)

**Example:**

```html
<!-- Render a specific section's navigation tree -->
<% const blogTree = stati.nav.getSubtree('/blog') %>
<% if (blogTree.length > 0) { %>
  <div class="blog-nav">
    <h3><%= blogTree[0].title %></h3>
    <% if (blogTree[0].children) { %>
      <ul>
        <% blogTree[0].children.forEach(post => { %>
          <li><a href="<%= post.url %>"><%= post.title %></a></li>
        <% }) %>
      </ul>
    <% } %>
  </div>
<% } %>
```

---

### `stati.nav.getBreadcrumbs(path?)`

Gets the breadcrumb trail to a specific path. The trail starts at the top-level node that contains the page, which for nested pages is the nearest collection rather than the site root: for `/docs/api/hooks` it is `[API, Hooks]`, and for `/docs/intro` it is `[Docs, Intro]` (see [Tree shape](#tree-shape)). Add a Home link yourself.

**Signature:**

```typescript
getBreadcrumbs(path?: string): NavNode[]
```

**Parameters:**

- `path` (string, optional): Path to get breadcrumbs for. Defaults to current page.

**Returns:** Array of nodes from the containing top-level node to the target

**Example:**

```html
<!-- Breadcrumb navigation -->
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <% stati.nav.getBreadcrumbs().forEach((crumb, index, array) => { %>
      <li>
        <% if (index === array.length - 1) { %>
          <span aria-current="page"><%= crumb.title %></span>
        <% } else { %>
          <a href="<%= crumb.url %>"><%= crumb.title %></a>
        <% } %>
      </li>
    <% }) %>
  </ol>
</nav>
```

---

### `stati.nav.getCurrentNode()`

Gets the current page's navigation node.

**Signature:**

```typescript
getCurrentNode(): NavNode | undefined
```

**Returns:** The navigation node for the current page or `undefined`

**Example:**

```html
<!-- Show current page's metadata -->
<% const currentNode = stati.nav.getCurrentNode() %>
<% if (currentNode) { %>
  <div class="page-meta">
    <h1><%= currentNode.title %></h1>
    <% if (currentNode.publishedAt) { %>
      <time datetime="<%= currentNode.publishedAt.toISOString() %>">
        <%= currentNode.publishedAt.toLocaleDateString() %>
      </time>
    <% } %>
    <% if (currentNode.children && currentNode.children.length > 0) { %>
      <p>This section contains <%= currentNode.children.length %> pages</p>
    <% } %>
  </div>
<% } %>
```

---

## Current page context

### `stati.page.navNode`

Direct access to the current page's navigation node with all its properties and children. For the index page of a top-level folder this is the collection node, so `children` lists the folder's pages; for other pages it is a page node without `children` (nested folders: see the note under [Tree shape](#tree-shape)).

**Type:** `NavNode | undefined`

**Example:**

```html
<!-- Show children of current page -->
<% if (stati.page.navNode?.children) { %>
  <div class="child-pages">
    <h2>In This Section</h2>
    <ul>
      <% stati.page.navNode.children.forEach(child => { %>
        <li>
          <a href="<%= child.url %>"><%= child.title %></a>
        </li>
      <% }) %>
    </ul>
  </div>
<% } %>
```

---

## Common patterns

### Multi-level nested navigation

```html
<!-- site/partials/nested-nav.eta -->
<% function renderNavTree(nodes, level = 0) { %>
  <ul class="<%= stati.propValue(`nav-level-${level}`) %>">
    <% nodes.forEach(node => { %>
      <li>
        <a
          href="<%= node.url %>"
          class="<%= stati.page.url === node.url ? 'active' : '' %>"
        >
          <%= node.title %>
        </a>
        <% if (node.children && node.children.length > 0) { %>
          <% renderNavTree(node.children, level + 1) %>
        <% } %>
      </li>
    <% }) %>
  </ul>
<% } %>

<nav class="site-navigation">
  <% renderNavTree(stati.nav.tree) %>
</nav>
```

Because every collection folder is a top-level node, this renders at most two levels: top-level pages and collections, and each collection's pages.

### Section navigation with active state

```html
<!-- Show navigation for current section only -->
<% const parent = stati.nav.getParent() %>

<% if (parent?.children) { %>
  <nav class="section-nav">
    <h2><%= parent.title %></h2>
    <ul>
      <% parent.children.forEach(page => { %>
        <li>
          <a
            href="<%= page.url %>"
            class="<%= stati.page.url === page.url ? 'active' : '' %>"
          >
            <%= page.title %>
          </a>
        </li>
      <% }) %>
    </ul>
  </nav>
<% } %>
```

### Table of contents for collection

A subsection's pages are not under its node in `children`, so look each subsection up among the top-level collection nodes:

```html
<!-- Generate TOC for a section and its subsections -->
<%
  const collection = (url) => stati.nav.tree.find(n => n.isCollection && n.url === url);
  const section = collection('/docs');
%>
<% if (section?.children) { %>
  <aside class="toc">
    <h2>Documentation</h2>
    <nav>
      <% section.children.forEach(subsection => { %>
        <% const pages = collection(subsection.url)?.children ?? [] %>
        <div class="toc-section">
          <a href="<%= subsection.url %>"><%= subsection.title %></a>
          <% if (pages.length > 0) { %>
            <ul>
              <% pages.forEach(page => { %>
                <li>
                  <a href="<%= page.url %>"><%= page.title %></a>
                </li>
              <% }) %>
            </ul>
          <% } %>
        </div>
      <% }) %>
    </nav>
  </aside>
<% } %>
```

### Smart sidebar (current section only)

```html
<!-- site/partials/smart-sidebar.eta -->
<% const parent = stati.nav.getParent() %>

<aside class="sidebar">
  <% if (parent) { %>
    <div class="sidebar-section">
      <h3><%= parent.title %></h3>
      <ul>
        <% stati.nav.getSiblings(undefined, true).forEach(page => { %>
          <li>
            <a
              href="<%= page.url %>"
              class="<%= stati.page.url === page.url ? 'active' : '' %>"
            >
              <%= page.title %>
            </a>

            <!-- Show children if this is the current page -->
            <% if (page.url === stati.page.url && page.children) { %>
              <ul class="subsection">
                <% page.children.forEach(child => { %>
                  <li>
                    <a href="<%= child.url %>"><%= child.title %></a>
                  </li>
                <% }) %>
              </ul>
            <% } %>
          </li>
        <% }) %>
      </ul>
    </div>
  <% } %>
</aside>
```

---

## See also

- [Template Data and Context](/core-concepts/templates/#template-data-and-context)
- [API overview](/api/reference)
- [Routing System](/core-concepts/routing)
