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

Invalidate cache by tags or paths:

```bash
# If installed locally
npx stati invalidate [options]

# If using npx directly
npx @stati/cli invalidate [options]
```

**Options:**

- `--tags <tags>` - Comma-separated list of tags to invalidate
- `--paths <paths>` - Comma-separated list of paths to invalidate
- `--config <path>` - Path to config file

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
