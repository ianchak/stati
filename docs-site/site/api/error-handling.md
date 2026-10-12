---
title: 'Error handling'
description: 'Learn how Stati handles errors during build and development.'
order: 3
---

# Error handling

Stati implements a comprehensive error handling strategy designed to provide graceful failures, clear error messages, and robust recovery mechanisms. Understanding how Stati handles errors helps you debug issues and build more resilient sites.

## Error handling philosophy

Stati follows these key principles:

1. **Graceful Degradation** - Continue operation with fallback behavior when possible
2. **Clear Error Messages** - All errors include actionable information
3. **Fail Fast** - Configuration errors are caught early in the build process
4. **Recovery Mechanisms** - Built-in fallbacks ensure partial builds can succeed

## Error categories

### Configuration errors

**When they occur**: During configuration loading and validation

**Handling**: Immediate failure with detailed error message

**Common scenarios**:

- Configuration file not found or unreadable
- Invalid configuration syntax (malformed JSON/JS)
- Missing required configuration fields
- Invalid configuration values (e.g., ISG validation failures)

**Example errors**:

```javascript
// Example: Invalid configuration
export default {
  srcDir: 123, // ❌ Error: srcDir must be a string
  isg: {
    ttlSeconds: 'invalid' // ❌ Error: ISGConfigurationError - ttlSeconds must be a number
  }
};
```

### Content loading errors

**When they occur**: During content discovery and front matter parsing

**Handling**:

- **Individual file errors**: Skips unreadable files with warning and continues
- **Directory errors**: Build fails if content directory is inaccessible
- **Empty directory**: Build continues (valid scenario)

**Common scenarios**:

- Individual content files that cannot be read
- Invalid front matter (parsed but may cause issues downstream)
- Empty content directory (handled gracefully)
- Content directory not found (build fails)

### Template rendering errors

**When they occur**: During template processing and HTML generation

**Handling**:

- **Development mode**: Throws `TemplateError` with detailed context (file, line, column)
- **Production mode**: Uses built-in fallback template (see Fallback Mechanisms section)

**Common scenarios**:

- Template file not found
- Template syntax errors
- Template rendering failures (both layouts and partials)
- Missing template data

**Applies to**: Both layout templates and partial templates

```eta
<!-- Template syntax error -->
<% if (stati.collection?.pages { %> <!-- ❌ Missing closing parenthesis -->
  <ul>
    <% stati.collection.pages.forEach(page => { %>
      <li><%= page.title %></li>
    <% }); %>
  </ul>
<% } %>
```

### File system errors

**When they occur**: During output file writing and static asset copying

**Handling**: Immediate failure (critical for build success)

**Common scenarios**:

- Output directory permission errors
- Disk space exhausted
- File system corruption
- Directory creation failures

### Build hook errors

**When they occur**: During execution of user-defined build hooks

**Handling**: Immediate failure (hooks are user-controlled)

**Common scenarios**:

- Hook function throws an exception
- Async hook rejection
- Hook timeout

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      throw new Error('Hook failed'); // ❌ Will stop the build
    }
  }
});
```

## Error classes

Stati uses domain-specific error classes that capture relevant context for debugging. Each error type includes structured information to help identify and resolve issues quickly.

### Template errors

```typescript
class TemplateError extends Error {
  public readonly filePath?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly template?: string;
  public readonly context?: {
    before?: string[];
    after?: string[];
  };

  constructor(
    message: string,
    filePath?: string,
    line?: number,
    column?: number,
    template?: string
  ) {
    super(message);
    this.name = 'TemplateError';
    if (filePath !== undefined) this.filePath = filePath;
    if (line !== undefined) this.line = line;
    if (column !== undefined) this.column = column;
    if (template !== undefined) this.template = template;
  }
}
```

**Thrown when**: Template syntax errors, missing templates, or template rendering failures occur.

### ISG configuration errors

```typescript
class ISGConfigurationError extends Error {
  constructor(
    public readonly code: ISGValidationError,
    public readonly field: string,
    public readonly value: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ISGConfigurationError';
  }
}

enum ISGValidationError {
  INVALID_TTL = 'ISG_INVALID_TTL',
  INVALID_MAX_AGE_CAP = 'ISG_INVALID_MAX_AGE_CAP',
  INVALID_AGING_RULE = 'ISG_INVALID_AGING_RULE',
  DUPLICATE_AGING_RULE = 'ISG_DUPLICATE_AGING_RULE',
  UNSORTED_AGING_RULES = 'ISG_UNSORTED_AGING_RULES',
  AGING_RULE_EXCEEDS_CAP = 'ISG_AGING_RULE_EXCEEDS_CAP'
}
```

**Thrown when**: ISG configuration validation fails (invalid TTL, aging rules, etc.).

### Circular dependency errors

```typescript
class CircularDependencyError extends Error {
  constructor(
    public readonly dependencyChain: string[],
    message: string
  ) {
    super(message);
    this.name = 'CircularDependencyError';
  }
}
```

**Thrown when**: Template dependencies form a circular reference.

### Bundle configuration errors

```typescript
class DuplicateBundleNameError extends Error {
  constructor(duplicates: string[]) {
    super(
      `Duplicate bundleName(s) found in configuration: ${duplicates.join(', ')}. ` +
        'Each bundle must have a unique bundleName.'
    );
    this.name = 'DuplicateBundleNameError';
  }
}
```

**Thrown when**: TypeScript bundle configurations contain duplicate bundle names.

## Fallback mechanisms

### Template fallback

When template rendering fails, Stati uses a built-in fallback that generates minimal valid HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>
```

The fallback template:

- Uses the page's title and description from frontmatter
- HTML-escapes all content for security
- Renders the markdown-processed body content
- Provides a minimal but valid HTML structure

### Navigation fallback

Stati builds navigation from the page structure during the content loading phase. If no pages are found or the pages array is empty, navigation will be an empty array. However, if navigation building encounters an error (such as corrupted page data), the build will fail rather than providing a fallback, as navigation is critical to site structure

## Error reporting

### Console output

Stati uses colored console output:

- **🔴 Errors**: Red text, logged to stderr
- **🟡 Warnings**: Yellow text, logged to stdout
- **ℹ️ Info**: Standard text, logged to stdout

### Error context

Error messages include relevant context:

```text
Error rendering layout /blog/layout.eta for page /blog/my-post/:
Template syntax error: Unexpected token 'if' at line 15
```

### Build statistics

Build statistics are tracked and returned from the build function:

```typescript
interface BuildStats {
  /** Total number of pages processed */
  totalPages: number;
  /** Number of static assets copied */
  assetsCount: number;
  /** Total build time in milliseconds */
  buildTimeMs: number;
  /** Total size of output directory in bytes */
  outputSizeBytes: number;
  /** Number of cache hits (if caching enabled) */
  cacheHits?: number;
  /** Number of cache misses (if caching enabled) */
  cacheMisses?: number;
}
```

## Debugging approaches

### 1. Isolate the problem

**Build with subset of content:**

```bash
# Move most content out temporarily
mv site/blog site/blog-backup
stati build
```

**Check configuration:**

```bash
# Test configuration loading
node -e "console.log(require('./stati.config.js'))"
```

### 2. Check build output

Examine build output for error messages and stack traces. Stati provides detailed error information including file paths and line numbers when available.

### 3. Common error scenarios

**Build fails immediately:**

- ✅ Check configuration file syntax
- ✅ Verify directory permissions
- ✅ Ensure required directories exist

**Some pages missing from output:**

- ✅ Check for `draft: true` in front matter
- ✅ Verify content directory structure
- ✅ Look for template resolution errors

**Template rendering issues:**

- ✅ Verify template syntax in isolation
- ✅ Check template data availability
- ✅ Review template file permissions

## Best practices

### 1. Validate configuration

Test your configuration in development:

```javascript
// stati.config.js
import { defineConfig } from '@stati/core';

export default defineConfig({
  // Configuration with TypeScript validation
  site: {
    title: 'My Site',
    baseUrl: process.env.NODE_ENV === 'production'
      ? 'https://mysite.com'
      : 'http://localhost:3000'
  }
});
```

### 2. Handle hook errors gracefully

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      try {
        // Your hook logic
        await processExternalData();
      } catch (error) {
        console.error('Hook failed:', error);
        // Decide whether to continue or fail
        throw error; // Re-throw to stop build
      }
    }
  }
});
```

### 4. Test content incrementally

**Gradual rollout approach:**

1. Test with a subset of content first
2. Use `--include-drafts` flag for testing draft content
3. Monitor build output for errors
4. Fix issues before expanding content

### 4. Use consistent front matter

**Establish a schema:**

```yaml
---
title: string (required)
description: string (required)
date: YYYY-MM-DD (required)
draft: boolean (optional)
tags: string[] (optional)
---
```

## Recovery strategies

### Partial build success

Stati attempts to build as many pages as possible:

- ✅ Identify problematic content incrementally
- ✅ Deploy partial updates while fixing issues
- ✅ Maintain site functionality during updates

### Build interruption recovery

If a build is interrupted:

- **Cache preservation**: `.stati` directory preserves progress
- **Atomic operations**: Static assets copied atomically
- **Clean state**: Subsequent builds resume cleanly

### Cache-related issues

**Clear cache when encountering:**

```bash
# Clear all cache
stati build --clean

# Force complete rebuild
stati build --force

# Clear and rebuild
stati build --clean --force
```

## Development workflow

### 1. Start with clean build

```bash
# Ensure clean starting point
stati build --clean
```

### 2. Monitor development server

```bash
# Watch for errors in development
stati dev
```

The development server provides an error overlay in the browser when build errors occur, making it easy to identify and fix issues without checking terminal output.

### 3. Test production build

```bash
# Test production build before deployment
NODE_ENV=production stati build
```

### 4. Validate output

```bash
# Check generated files
ls -la dist/
# Verify critical pages exist
test -f dist/index.html && echo "✅ Homepage exists"
```

Understanding Stati's error handling helps you build more reliable sites and debug issues more effectively. Combined with proper configuration validation and incremental testing, you can maintain robust build processes even with complex content structures.
