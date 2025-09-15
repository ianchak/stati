# @stati/core

## 1.3.2

### Patch Changes

- extract test mock utilities and standardize patterns
  - Create packages/core/src/tests/utils/test-mocks.ts with reusable mock factory functions

  Commit: 27e8c0e

- add newline at end of LICENSE file for consistency

  Commit: 73685cf

- modularize build process for improved clarity and testing

  Commit: 26a7e01

- update development commands for clarity and consistency

  Commit: 2f922c0

- extract SHA-256 hash creation pattern
  - Add createSha256Hash() helper to eliminate duplicate patterns

  Commit: 5b77924

- enhance CLI tests with additional mocks and assertions

  Commit: 9cd85eb

- consolidate duplicate template discovery logic
  - Create packages/core/src/core/utils/template-discovery.ts with shared utilities

  Commit: 93c4626

- strengthen type safety with readonly modifiers
  - Add readonly to immutable cache entry properties (path, inputsHash, deps, tags, etc.)

  Commit: c28f83c

- remove unnecessary console spacing in build logs

  Commit: 918e9e6

- improve commit parsing for clarity

  Commit: bba9ed6

- improve directory scanning for partials discovery

  Commit: 5c66645

- harden ESLint rules for code quality
  - Add stricter ESLint rules: prefer-const, stricter no-unused-vars, eqeqeq, no-var

  Commit: 1a2a0b7

- enhance partials discovery and rendering tests

  Commit: a041dc8

- enhance template path resolution for hierarchical search

  Commit: 6dab506

- use posix.relative for consistent path handling

  Commit: 85f42e4

- extract file system path resolution utilities (REFAC-20250914-03)

  Extract common path resolution patterns into centralized utilities:

  Commit: 5790134

- extract fs error handling wrapper

  Commit: c79b3b4

- extract config file patterns into reusable utilities
  - Add getConfigFilePaths() helper function in config/loader.ts

  Commit: a181557

- restructure dev server functions for improved clarity

  Commit: 703ba81

- clean up redundant test comments
  - Remove obvious comments that don't add value ('Create test files', 'Verify content')

  Commit: 245b02e

- centralize logger creation and enhance logging methods

  Commit: b1f19cc

- add comprehensive tests for file system utilities

  Commit: 1547b23

- update default TTL for incremental static generation

  Commit: c4ec644

- deduplicate path resolution logic
  - Import and use resolveSrcDir() from utils/paths.ts

  Commit: 6c3d01a

- remove outdated refactoring log file

  Commit: 16dabf9

- simplify path handling in partial discovery

  Commit: 5f68c3c

- update license from ISC to MIT and add LICENSE file

  Commit: ddbbed5

- extract magic constants into centralized constants module
  - Create packages/core/src/constants.ts with organized constant groups

  Commit: 30f6cbe

- replace hardcoded extensions with constants for clarity

  Commit: 251d2c7

- enhance mock implementation for readFile in snapshots

  Commit: 8c211da

- update test:ci script to include build step

  Commit: 2c33fda

- centralize file system operations in utils module

  Commit: 3ef399a

- normalize paths for consistent partials discovery

  Commit: 64cc5a6

## 1.3.1

### Patch Changes

- enhance logging and rebuild process for templates

  Commit: 840473d

## 1.3.0

### Minor Changes

- enhance build process with ISG support and caching improvements

  Commit: 6403c1e

## 1.2.0

### Minor Changes

- add additional test scripts for blank example project

  Commit: 5e938fc

- implement automated changeset generation script

  Commit: ed82f65

- implement Incremental Static Generation (ISG) caching mechanism

  Commit: d412ce2

- Implement build locking mechanism and validation for ISG configuration

  Commit: 5f2c0ba

- implement rendering tree for build process visualization

  Commit: 0366479

- integrate ISG logic for incremental rebuilds and caching

  Commit: 3f65a6c

- ce73559: Implemented milestone 5 with other improvements

### Patch Changes

- remove unused changeset generation script

  Commit: 12c8c8b

- remove blog template example as there are other plans in the future

  Commit: 56c0749

- update quick start guide and enhance project creation section

  Commit: 26c4364

- replace chalk with custom ANSI colors for CLI output

  Commit: dae7d28

- remove spinner utilities and update dependencies

  Commit: daaa85d

- update README and CONTRIBUTING for consistency and clarity

  Commit: 7e11b82

- format log messages for better readability

  Commit: 3130f88

- add comprehensive tests for ISG cache invalidation, manifest handling, and TTL management

  Commit: a641d13

- add .stati to ignore list and remove cache manifest

  Commit: d8aa7bf

- normalize paths to use posix format across modules

  Commit: 4a1c10c

- update cache manifest handling in build and test files

  Commit: a410981

- update console output expectations for ISG rebuilding

  Commit: 43378cb

- update cache manifest path handling in template change

  Commit: 896778a

- Implemented milestone 5 with other improvements

  Commit: ce73559

- update cache key calculation to use relative path

  Commit: b5c46f9

- improve glob pattern matching and conversion to regex

  Commit: 646a056

- update CLI commands and ISG features

  Commit: c82964b

- update ISG ttlSeconds to 6 hours for better caching

  Commit: b591c81

- remove cli-table3 dependency and update logging format

  Commit: d32c709

- update cache invalidation documentation to include patterns and age

  Commit: e27f6a2

## 1.1.0

### Minor Changes

- implement automated changeset generation from commits

  Commit: 66c0c80

- implement development server with live reload functionality

  Commit: e361676

- enhance logging and add new dependencies for better output

  Commit: 78ee0dd

- implement development server with live reload functionality

  Commit: e361676

- add version option to build process and update logging

  Commit: 483aed1

- implement automated changeset generation from commits

  Commit: 66c0c80

- add version option to build process and update logging

  Commit: 483aed1

- add logging and color utilities for improved CLI output

  Commit: 89c1bab

- enhance partial rendering with error handling and context updates

  Commit: 2c1fcdb

- enhance partial rendering with error handling and context updates

  Commit: 2c1fcdb

- enhance logging and add new dependencies for better output

  Commit: 78ee0dd

- add logging and color utilities for improved CLI output

  Commit: 89c1bab

### Patch Changes

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- add mock for copyFile in build and error scenarios

  Commit: 995aa1d

- update build:ci script to specify package for npm exec

  Commit: c03d034

- fix build command in CI workflow

  Commit: 5bb2f90

- update CI scripts for linting and type checking in examples

  Commit: a37fdb0

- add comprehensive README for Stati CLI, Core, and Create-Stati

  Commit: a63fc18

- use npx for script commands in package.json

  Commit: 4981171

- remove gold-ants-hug changeset file

  Commit: bf685d3

- update build:ci script to use npm exec for execution

  Commit: 8fc3625

- simplify build progress log messages in tests

  Commit: 4028cd0

- remove gold-ants-hug changeset file

  Commit: bf685d3

- add comprehensive README for Stati CLI, Core, and Create-Stati

  Commit: a63fc18

- update CI build command to include examples/blog

  Commit: 2e8c039

- update CONTRIBUTING and README for clarity and completeness

  Commit: e781bbe

- update build:ci command to ensure proper execution in examples

  Commit: f03ed50

- update build:ci script to install dependencies without global flag

  Commit: fc92a95

- update build:ci command to ensure proper execution in examples

  Commit: f03ed50

- update build:ci script to specify package for npm exec

  Commit: c03d034

- update build:ci script to install dependencies without global flag

  Commit: fc92a95

- update mock build response keys for consistency

  Commit: 9dd17bf

- streamline CI workflow by consolidating test commands

  Commit: de1a30b

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to use npm exec for execution

  Commit: 8fc3625

- use npx for script commands in package.json

  Commit: 4981171

- streamline CI workflow by consolidating test commands

  Commit: de1a30b

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update CI scripts for linting and type checking in examples

  Commit: a37fdb0

- update CONTRIBUTING and README for clarity and completeness

  Commit: e781bbe

- add mock for copyFile in build and error scenarios

  Commit: 995aa1d

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- update CI build command to include examples/blog

  Commit: 2e8c039

- remove duplicate build step in CI workflow

  Commit: 764c978

- simplify build progress log messages in tests

  Commit: 4028cd0

- update mock build response keys for consistency

  Commit: 9dd17bf

- fix build command in CI workflow

  Commit: 5bb2f90

- remove duplicate build step in CI workflow

  Commit: 764c978

## 1.0.0

### Major Changes

- ed11dc0: Initial release of @stati/core - the core engine for Stati static site generator

  This is the first public release of @stati/core, featuring:
  - **Static site generation**: Build fast, modern websites from Markdown content
  - **Template rendering**: Powerful templating with Eta templates
  - **TypeScript support**: Full TypeScript support throughout
  - **Flexible content structure**: Support for various content organization patterns
  - **Plugin system**: Extensible architecture for custom functionality
  - **Content processing**: Markdown processing, frontmatter parsing, and navigation generation
