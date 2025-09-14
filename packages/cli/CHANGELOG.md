# @stati/cli

## 1.2.0

### Minor Changes

- add additional test scripts for blank example project

  Commit: 5e938fc

- implement automated changeset generation script

  Commit: ed82f65

- implement Incremental Static Generation (ISG) caching mechanism

  Commit: d412ce2

- implement rendering tree for build process visualization

  Commit: 0366479

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

- add .stati to ignore list and remove cache manifest

  Commit: d8aa7bf

- Implemented milestone 5 with other improvements

  Commit: ce73559

- update CLI commands and ISG features

  Commit: c82964b

- update ISG ttlSeconds to 6 hours for better caching

  Commit: b591c81

- remove cli-table3 dependency and update logging format

  Commit: d32c709

- update cache invalidation documentation to include patterns and age

  Commit: e27f6a2

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies [ce73559]
  - @stati/core@1.2.0

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

- enhance logging and add new dependencies for better output

  Commit: 78ee0dd

- add logging and color utilities for improved CLI output

  Commit: 89c1bab

### Patch Changes

- rename build job to test in CI workflow

  Commit: b4c0ec7

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

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

- update build:ci script to install @stati/cli globally

  Commit: ea82827

- update build:ci script to install latest @stati/cli

  Commit: e5f43d5

- update CI build command to include examples/blog

  Commit: 2e8c039

- remove duplicate build step in CI workflow

  Commit: 764c978

- fix build command in CI workflow

  Commit: 5bb2f90

- remove duplicate build step in CI workflow

  Commit: 764c978

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @stati/core@1.1.0

## 1.0.0

### Major Changes

- ed11dc0: Initial release of @stati/cli - the command line interface for Stati static site generator

  This is the first public release of @stati/cli, featuring:
  - **CLI tool**: Easy-to-use command line interface for building sites
  - **Build commands**: Support for build, dev, and preview commands
  - **Integration**: Works seamlessly with @stati/core engine
