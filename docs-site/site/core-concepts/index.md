---
title: 'Core Concepts'
description: 'Understand the fundamental concepts that power Stati.'
---

# Core Concepts

Stati is built on several key concepts that work together to create a powerful yet simple static site generation experience. Understanding these concepts will help you make the most of Stati's features.

## Overview

Stati combines modern web development tools with proven static site generation patterns:

- **[Filesystem-based Routing](/core-concepts/routing/)** - Your directory structure becomes your site structure
- **[Templates & Layouts](/core-concepts/templates/)** - Flexible templating with Eta and layout inheritance
- **[Markdown Pipeline](/core-concepts/markdown/)** - Enhanced Markdown processing with extensible plugins
- **[Incremental Static Generation (ISG)](/core-concepts/isg/)** - Smart caching and rebuilding for optimal performance
- **[Static Assets & Bundling](/core-concepts/static-assets/)** - Modern asset processing powered by Vite

## The Stati Philosophy

### TypeScript-First

Stati is built with TypeScript from the ground up, providing:

- Full type safety for configuration
- IntelliSense in your editor
- Better debugging and error messages
- Future-proof development experience

### Performance by Default

Every feature in Stati is designed with performance in mind:

- Fast development server with hot module replacement
- Incremental builds that only process changed files
- Optimized production builds with code splitting
- Smart caching that adapts to your content

### Minimal Dependencies

Stati keeps its dependency footprint small by:

- Using Vite for development and bundling (you probably already use it)
- Leveraging proven libraries like Markdown-It and Eta
- Avoiding heavy frameworks and unnecessary abstractions
- Focusing on core functionality that most sites need

### Developer Experience

Great DX is at the heart of Stati:

- Zero-config setup that works out of the box
- Intuitive file-based routing system
- Live reload during development
- Clear error messages and debugging information
- Flexible enough for any use case

## How It All Works Together

Here's how these concepts combine when you're working with Stati:

### 1. Content Creation

You write content in Markdown files with front matter metadata. The file location determines the URL structure.

### 2. Template Processing

Stati uses Eta templates to render your content, with support for:

- Layout inheritance
- Partial templates
- Custom filters and helpers
- Dynamic content generation

### 3. Asset Processing

Vite handles all your CSS, JavaScript, and static assets with:

- Modern ES modules
- Hot module replacement
- Optimized production builds
- Support for PostCSS, Sass, and more

### 4. Smart Caching

ISG tracks dependencies and only rebuilds what's necessary:

- Content changes trigger targeted rebuilds
- Template changes rebuild affected pages
- Asset changes update only impacted files
- Time-based cache expiration for dynamic content

### 5. Output Generation

The final result is a fully static site optimized for:

- Fast loading times
- SEO-friendly URLs
- Modern web standards
- Easy deployment anywhere

## Getting Deeper

Each core concept builds on the others to create Stati's unique approach to static site generation. As you dive deeper into each topic, you'll discover how they work together to create a powerful and flexible system.

Start with [Filesystem-based Routing](/core-concepts/routing/) to understand how Stati maps your content to URLs, then explore the other concepts to master the full Stati workflow.

## Common Patterns

### Blog Sites

- Content in `site/blog/` directory
- Date-based organization with front matter
- Layout inheritance for consistent design
- ISG for efficient rebuilds of large archives

### Documentation Sites

- Hierarchical content structure
- Shared navigation and layout components
- Cross-references and internal linking
- Search-friendly URL structure

### Portfolio Sites

- Mixed content types (markdown + templates)
- Custom layouts for different sections
- Optimized image and asset handling
- Performance-focused builds

### Landing Pages

- Custom templates with dynamic content
- Integration with external APIs (build-time)
- Optimized for conversion and SEO
- Fast loading and minimal JavaScript

Ready to dive in? Start with [Filesystem-based Routing](/core-concepts/routing/) to understand how Stati organizes your content.
