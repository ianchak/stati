# @stati/cli

The command-line interface for Stati, a lightweight TypeScript static site generator.

## Installation

### For new projects (recommended)

Use the scaffolding tool to create a new Stati site:

```bash
npx create-stati
```

### For existing projects

Install locally as a development dependency:

```bash
npm install --save-dev @stati/cli
```

### One-time usage

Use npx to run Stati commands without installation:

```bash
npx @stati/cli dev
npx @stati/cli build
```

## Usage

### Development Server

Start a development server with live reload:

```bash
# If installed locally
npm run dev
# or
stati dev [options]

# If using npx directly
npx @stati/cli dev [options]
```

**Options:**

- `--port <number>` - Server port (default: 3000)
- `--open` - Open browser automatically
- `--config <path>` - Path to config file

### Build Site

Build your site for production:

```bash
# If installed locally
npm run build
# or
stati build [options]

# If using npx directly
npx @stati/cli build [options]
```

**Options:**

- `--force` - Force full rebuild without deleting cache
- `--clean` - Clean cache before building
- `--config <path>` - Path to config file
- `--include-drafts` - Include draft pages in the build

### Preview Built Site

Preview your built site locally:

```bash
# If installed locally
npm run preview
# or
stati preview [options]

# If using npx directly
npx @stati/cli preview [options]
```

**Options:**

- `--port <number>` - Server port (default: 4000)
- `--open` - Open browser automatically
- `--config <path>` - Path to config file

The preview command serves the static files from your `dist/` directory, allowing you to test your production build locally before deployment.

### Cache Management

Invalidate cache by tags, paths, patterns, or age:

```bash
# If installed locally
stati invalidate [query]

# If using npx directly
npx @stati/cli invalidate [query]
```

**Query Formats:**

- `tag:value` - Invalidate by tag
- `path:value` - Invalidate by path (supports prefixes)
- `glob:pattern` - Invalidate by glob pattern
- `age:duration` - Invalidate content younger than specified age

**Examples:**

```bash
# Invalidate by tag
stati invalidate "tag:blog"

# Invalidate by path prefix
stati invalidate "path:/posts"

# Invalidate by glob pattern
stati invalidate "glob:/blog/**"

# Invalidate content younger than 3 months
stati invalidate "age:3months"

# Invalidate content younger than 1 week
stati invalidate "age:1week"

# Multiple criteria (OR logic)
stati invalidate "tag:blog age:1month"

# Clear entire cache
stati invalidate
```

**Age Formats:**

- `age:30days` or `age:30day` - Content younger than 30 days
- `age:2weeks` or `age:2week` - Content younger than 2 weeks
- `age:6months` or `age:6month` - Content younger than 6 months
- `age:1year` or `age:1years` - Content younger than 1 year

**Note**: Age calculations use exact calendar arithmetic. Months and years account for varying month lengths and leap years, not fixed approximations.

## Getting Started

1. Create a new site using `create-stati`:

   ```bash
   npm create stati my-site
   ```

2. Navigate to your site directory:

   ```bash
   cd my-site
   ```

3. Start the development server:

   ```bash
   npm run dev
   # or
   stati dev
   ```

4. Build for production:

   ```bash
   npm run build
   # or
   stati build
   ```

5. Preview the production build:

   ```bash
   npm run preview
   # or
   stati preview
   ```

## License

MIT © [Imre Csige](https://github.com/ianchak)
