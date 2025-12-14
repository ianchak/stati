---
title: 'API Reference'
description: 'Complete Stati API reference index - templates, hooks, navigation, and more.'
order: 0
---

# Stati API Reference

Stati provides comprehensive APIs for building dynamic static sites. This page serves as an index to all available API documentation.

## Template APIs

### [Template API](/api/templates/)

Complete reference for Stati template context, built-in helpers, and partial templates. Learn how to work with `stati.propValue()`, template context objects, custom filters, and reusable partials.

**Key Topics:**

- Template context (`stati` object)
- Built-in helpers (`propValue`, text processing)
- Partial templates and component patterns
- Custom filter registration

### [Navigation API](/api/navigation/)

Comprehensive guide to Stati's navigation system and helper methods. Learn how to query and traverse the automatically-generated navigation tree.

**Key Topics:**

- Navigation structure (`NavNode` interface)
- Helper methods (`findNode`, `getBreadcrumbs`, `getSiblings`, etc.)
- Current page context
- Common navigation patterns

## Build & Configuration APIs

### [Build Hooks](/api/hooks/)

Lifecycle hooks for customizing the build process. Inject custom logic before and after builds, or modify pages during rendering.

**Key Topics:**

- `beforeAll` and `afterAll` hooks
- `beforeRender` and `afterRender` hooks
- Hook context objects
- Practical use cases

### [TypeScript Types](/api/types/)

Full TypeScript type definitions for Stati's configuration, template context, and programmatic APIs.

**Key Topics:**

- Configuration types (`StatiConfig`, `SiteConfig`, etc.)
- Template context types (`TemplateContext`, `NavNode`, etc.)
- Build and hook types
- Type-safe configuration with `defineConfig`

## Feature APIs

### [SEO API](/api/seo/)

Automatic SEO meta tag generation for Open Graph, Twitter Cards, and Schema.org markup.

**Key Topics:**

- `generateSEO()` template helper
- Configurable SEO defaults
- Page-level SEO overrides
- Automatic sitemap and robots.txt generation

### [RSS API](/api/rss/)

RSS feed generation for blogs and content collections.

**Key Topics:**

- RSS feed configuration
- Content filtering and sorting
- Custom feed metadata
- Multiple feed support

### [Error Handling](/api/error-handling/)

Error handling patterns and debugging tools in Stati.

**Key Topics:**

- Development error overlay
- Error handling in hooks
- Build error recovery
- TypeScript error diagnostics

## Quick Links

### Getting Started

- [Quick Start Guide](/getting-started/quick-start/) - Build your first Stati site
- [Core Concepts](/core-concepts/overview/) - Understand Stati's architecture
- [Configuration Guide](/configuration/file/) - Configure your site

### Advanced Usage

- [Advanced Topics](/advanced/topics/) - Performance, SEO, and deployment
- [Examples](/examples/list/) - Real-world templates and patterns
- [Contributing](/advanced/contributing/) - Help improve Stati
