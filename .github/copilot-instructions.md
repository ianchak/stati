# Stati Codebase Instructions for AI Coding Agents

## Project Overview

Stati is a **TypeScript-first static site generator** built as a monorepo with three core packages:

- `@stati/core` - Core SSG engine (Markdown-It + Eta templates)
- `@stati/cli` - Command-line interface (`stati build`, `dev`, `invalidate`)
- `create-stati` - Project scaffolder with interactive setup

## Architecture Patterns

### Monorepo Structure

- **Workspaces**: `packages/*` for core functionality, `examples/*` for templates
- **Build order**: Always build `core` → `cli` → `create-stati` (dependencies flow)
- **Testing**: Run `npm run test` from root, individual tests via workspace flags
- **Examples as integration tests**: `test:blank:*` scripts validate the full workflow

### Core Engine Design

- **Configuration**: TypeScript-first with `defineConfig()` helper for IntelliSense
- **File discovery**: Fast-glob patterns, excludes `_*` folders from content processing
- **Template hierarchy**: Cascading `layout.eta` files, auto-discovered `_partials/`
- **ISG (Incremental Static Generation)**: Cache manifest tracks dependencies, TTL aging, tag-based invalidation

### Content Processing Pipeline

1. **Content loading** (`core/content.ts`): Markdown files → `PageModel[]` with front-matter
2. **Template engine** (`core/templates.ts`): Eta rendering with hierarchical layouts
3. **Build process** (`core/build.ts`): Dependency tracking, cache validation, static asset copying
4. **Dev server** (`core/dev.ts`): with live reload and incremental rebuilding

## Development Workflows

### Essential Commands

```bash
# Full build (always run from root)
npm run build

# Test suite (170+ tests)
npm run test

# Example validation
npm run test:blank:full

# Scaffolder testing
npm run test:create-stati
npm run test:create-stati:cleanup
```

### File Modification Patterns

- **Core changes**: Always rebuild before testing examples
- **CLI changes**: Test with `examples/` directories using local builds
- **Create-stati changes**: Run scaffolder tests to validate templates
- **Breaking changes**: Update all three packages and examples simultaneously

### Configuration Validation

- Use `defineConfig()` wrapper for TypeScript IntelliSense
- Test config changes against `examples/blog/stati.config.js`
- ISG cache configuration lives in `.stati/cache/manifest.json`

## Project-Specific Conventions

### TypeScript Patterns

- **Strict mode**: All packages use strict TypeScript configuration
- **Import/export**: ES modules with `.js` extensions in import paths
- **Type exports**: Separate type-only exports from implementation exports
- **Interface design**: Prefer interfaces over types, extensive JSDoc comments

### Error Handling

- **Build errors**: Graceful failures with detailed error messages via custom logger
- **Cache corruption**: Automatic cache invalidation on renderer version bumps
- **File system operations**: Always use `fs-extra` wrapper functions

### Testing Conventions

- **Vitest**: Primary test runner with `node` environment
- **Mock patterns**: Use built-in mocking, avoid globals
- **Integration tests**: Examples serve as full-pipeline validation
- **File system tests**: Use temporary directories, clean up after tests

### Template System Specifics

- **Eta templates**: `.eta` files with hierarchical layout discovery
- **Partials**: Place in `_partials/` folders, auto-discovered by engine
- **Custom filters**: Define in config `eta.filters` object
- **Layout cascading**: Each directory can override parent layouts

## Critical Integration Points

### ISG Cache Management

- **Manifest location**: `.stati/cache/manifest.json`
- **Cache entries**: Track `inputsHash`, `deps`, `tags`, `publishedAt`, `renderedAt`
- **Invalidation strategies**: By tag (`tag:news`), path (`path:/blog/post`), age (`age:3months`)
- **TTL aging**: Progressive cache extension based on content age

### CLI-Core Interaction

- **Command delegation**: CLI imports core functions, no direct file manipulation
- **Option passing**: Structured interfaces (`BuildOptions`, `DevServerOptions`)
- **Logging**: Custom logger instances for consistent output formatting

### Scaffolder-Template Flow

- **Template selection**: Currently only `blank`, expandable system
- **Styling integration**: CSS/Sass/Tailwind setup during scaffolding
- **Package.json generation**: Dynamic scripts based on styling choice
- **Git initialization**: Optional with `--git` flag

### Dependency Management

- **Core dependencies**: markdown-it, eta, fast-glob, gray-matter
- **CLI dependencies**: yargs, chalk, cli-table3 for colored output and formatting
- **Scaffolder dependencies**: inquirer for interactive prompts
- **Dev dependencies**: vitest, typescript, eslint shared across packages

## Common Debugging Approaches

### Build Issues

- Check `.stati/cache/` directory for cache corruption
- Verify template hierarchy in source directories
- Validate front-matter YAML syntax in markdown files
- Test with `--clean` and `--force` flags for cache bypass

### Development Server Issues

- Ensure Vite port availability (default 3000)
- Check for infinite rebuild loops in file watching
- Validate template dependency chains

### Scaffolder Problems

- Test template generation in `examples/` directory
- Verify package.json script generation for different styling options
- Check file copying and directory creation permissions

## Performance Considerations

- **Incremental builds**: Default mode, use `--force` sparingly
- **File watching**: Debounced rebuilds in development mode
- **Asset copying**: Only copy changed files in static directory
- **Cache efficiency**: TTL aging reduces rebuild frequency for older content
