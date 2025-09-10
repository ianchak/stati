# @stati/cli

The command-line interface for Stati, a lightweight TypeScript static site generator.

## Installation

### For new projects (recommended)

Use the scaffolding tool to create a new Stati site:

```bash
npm create stati my-site
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
npx stati dev [options]

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
npx stati build [options]

# If using npx directly
npx @stati/cli build [options]
```

**Options:**

- `--force` - Force full rebuild without deleting cache
- `--clean` - Clean cache before building
- `--config <path>` - Path to config file
- `--include-drafts` - Include draft pages in the build

### Cache Management

Invalidate cache by tags, paths, patterns, or age:

```bash
# If installed locally
npx stati invalidate [query]

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
npx stati invalidate "tag:blog"

# Invalidate by path prefix
npx stati invalidate "path:/posts"

# Invalidate by glob pattern
npx stati invalidate "glob:/blog/**"

# Invalidate content younger than 3 months
npx stati invalidate "age:3months"

# Invalidate content younger than 1 week
npx stati invalidate "age:1week"

# Multiple criteria (OR logic)
npx stati invalidate "tag:blog age:1month"

# Clear entire cache
npx stati invalidate
```

**Age Formats:**

- `age:30days` or `age:30day` - Content younger than 30 days
- `age:2weeks` or `age:2week` - Content younger than 2 weeks
- `age:6months` or `age:6month` - Content younger than 6 months
- `age:1year` or `age:1years` - Content younger than 1 year

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
   npx stati dev
   ```

4. Build for production:

   ```bash
   npm run build
   # or
   npx stati build
   ```

## Configuration

Stati looks for a configuration file in the following order:

- `stati.config.ts`
- `stati.config.js`
- `stati.config.mjs`

For more information about configuration options, see the [@stati/core](../core) documentation.

## Project Structure

```
my-site/
├── site/           # Your content and pages
├── public/         # Static assets
├── stati.config.js # Configuration file
└── dist/           # Built site (generated)
```

## Features

- 🚀 Lightning-fast development server with live reload
- 📝 Markdown with front-matter support
- 🎨 Eta template engine with layouts and partials
- 🧭 Automatic navigation system
- 📁 Filesystem-based routing
- 💾 Smart caching and invalidation
- 🛠️ TypeScript-first configuration

## License

MIT
