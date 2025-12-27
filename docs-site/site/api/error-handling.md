---
title: 'Error Handling'
description: 'Learn how Stati handles errors during build and development.'
order: 3
---

# Error Handling

Stati implements a comprehensive error handling strategy designed to provide graceful failures, clear error messages, and robust recovery mechanisms. Understanding how Stati handles errors helps you debug issues and build more resilient sites.

## Error Handling Philosophy

Stati follows these key principles:

1. **Graceful Degradation** - Continue operation with fallback behavior when possible
2. **Clear Error Messages** - All errors include actionable information
3. **Fail Fast** - Configuration errors are caught early in the build process
4. **Recovery Mechanisms** - Built-in fallbacks ensure partial builds can succeed

## Error Categories

### Configuration Errors

**When they occur**: During configuration loading and validation

**Handling**: Immediate failure with detailed error message

**Common scenarios**:

- Configuration file not found or unreadable
- Invalid configuration syntax (malformed JSON/JS)
- Missing required configuration fields
- Invalid configuration values

**Error codes**: `CONFIG_NOT_FOUND`, `CONFIG_INVALID_SYNTAX`, `CONFIG_VALIDATION_FAILED`

```javascript
// Example: Invalid configuration
export default {
  srcDir: 123, // ❌ Error: srcDir must be a string
  isg: {
    ttlSeconds: 'invalid' // ❌ Error: ttlSeconds must be a number
  }
};
```

### Content Loading Errors

**When they occur**: During content discovery and front matter parsing

**Handling**: Skip problematic files and continue with build

**Common scenarios**:

- Content directory not found or inaccessible
- Individual content files with invalid front matter
- File system permission errors
- Corrupted content files

**Error codes**: `CONTENT_DIR_NOT_FOUND`, `FRONTMATTER_INVALID`, `FILE_READ_ERROR`

```yaml
---
title: My Post
date: invalid-date # ❌ Error: Invalid date format
draft # ❌ Error: Missing value for draft field
---
```

### Template Rendering Errors

**When they occur**: During template processing and HTML generation

**Handling**: Use built-in fallback template

**Common scenarios**:

- Template file not found
- Template syntax errors
- Template rendering failures
- Missing template data

**Error codes**: `TEMPLATE_NOT_FOUND`, `TEMPLATE_SYNTAX_ERROR`, `TEMPLATE_RENDER_ERROR`

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

### File System Errors

**When they occur**: During output file writing and static asset copying

**Handling**: Immediate failure (critical for build success)

**Common scenarios**:

- Output directory permission errors
- Disk space exhausted
- File system corruption
- Directory creation failures

**Error codes**: `PERMISSION_DENIED`, `DISK_SPACE_FULL`, `OUTPUT_DIR_ERROR`

### Build Hook Errors

**When they occur**: During execution of user-defined build hooks

**Handling**: Immediate failure (hooks are user-controlled)

**Common scenarios**:

- Hook function throws an exception
- Async hook rejection
- Hook timeout

**Error codes**: `HOOK_BEFORE_ALL_FAILED`, `HOOK_AFTER_ALL_FAILED`, `HOOK_BEFORE_RENDER_FAILED`, `HOOK_AFTER_RENDER_FAILED`

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      throw new Error('Hook failed'); // ❌ Will stop the build
    }
  }
});
```

## StatiError Class

Stati uses a structured error class for consistent error handling:

```typescript
class StatiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StatiError';
  }
}
```

### Error Code Patterns

Error codes follow consistent naming:

- **CONFIG_** - Configuration-related errors
- **CONTENT_** - Content loading and processing errors
- **TEMPLATE_** - Template rendering errors
- **FILE_** - File system operation errors
- **HOOK_** - Build hook execution errors
- **ISG_** - Incremental Static Generation errors

## Fallback Mechanisms

### Template Fallback

When template rendering fails, Stati uses a built-in fallback:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page.title}</title>
    <meta name="description" content="{page.description}">
</head>
<body>
    <main>{rendered_content}</main>
</body>
</html>
```

### Content Fallback

When markdown processing fails:

- Original content is wrapped in `<pre>` tags
- HTML is properly escaped for safety
- Build continues with fallback content

### Navigation Fallback

If navigation building fails:

- Empty navigation array is provided to templates
- Site remains functional without navigation
- Error is logged but build continues

## Error Reporting

### Console Output

Stati uses colored console output:

- **🔴 Errors**: Red text, logged to stderr
- **🟡 Warnings**: Yellow text, logged to stdout
- **ℹ️ Info**: Standard text, logged to stdout

### Error Context

Error messages include relevant context:

```text
Error rendering layout /blog/layout.eta for page /blog/my-post/:
Template syntax error: Unexpected token 'if' at line 15
```

### Build Statistics

Errors are tracked in build statistics:

```typescript
interface BuildStats {
  pages: number;
  assets: number;
  errors: number;
  warnings: number;
  criticalErrors: string[];
  buildTime: number;
}
```

## Debugging Approaches

### 1. Isolate the Problem

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

### 2. Use Verbose Logging

**Enable detailed output:**

```bash
DEBUG=stati:* stati build
```

**Check specific components:**

```bash
DEBUG=stati:templates stati build
DEBUG=stati:content stati build
```

### 3. Common Error Scenarios

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

## Best Practices

### 1. Validate Configuration

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

### 2. Handle Hook Errors Gracefully

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

### 3. Test Content Incrementally

**Gradual rollout approach:**

1. Test with a subset of content first
2. Use `--include-drafts` flag for testing
3. Monitor error output during builds
4. Fix issues before expanding content

### 4. Use Consistent Front Matter

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

## Recovery Strategies

### Partial Build Success

Stati attempts to build as many pages as possible:

- ✅ Identify problematic content incrementally
- ✅ Deploy partial updates while fixing issues
- ✅ Maintain site functionality during updates

### Build Interruption Recovery

If a build is interrupted:

- **Cache preservation**: `.stati` directory preserves progress
- **Atomic operations**: Static assets copied atomically
- **Clean state**: Subsequent builds resume cleanly

### Cache-Related Issues

**Clear cache when encountering:**

```bash
# Clear all cache
stati build --clean

# Force complete rebuild
stati build --force

# Clear and rebuild
stati build --clean --force
```

## Development Workflow

### 1. Start with Clean Build

```bash
# Ensure clean starting point
stati build --clean --verbose
```

### 2. Monitor Development Server

```bash
# Watch for errors in development
stati dev --verbose
```

### 3. Test Production Build

```bash
# Test production build before deployment
NODE_ENV=production stati build
```

### 4. Validate Output

```bash
# Check generated files
ls -la dist/
# Verify critical pages exist
test -f dist/index.html && echo "✅ Homepage exists"
```

Understanding Stati's error handling helps you build more reliable sites and debug issues more effectively. Combined with proper configuration validation and incremental testing, you can maintain robust build processes even with complex content structures.
