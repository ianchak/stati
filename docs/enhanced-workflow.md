# Enhanced Changesets Workflow

## Overview

Your project now has an enhanced changesets workflow that combines manual control with automation for semantic versioning and changelog generation. All publishing is done locally for full control over the release process.

## New Features Added

### 1. Conventional Commits Support

- Auto-generate changesets from your existing conventional commit messages
- Works with any commit message format that follows conventional commits
- Commit format: `type(scope): description`

### 2. Automated Changeset Generation

- Script to auto-generate changesets from conventional commits
- Run `npm run changeset:generate` to analyze commits and create changesets
- Intelligently detects affected packages based on file changes

## Workflow Guide

### Making Changes

1. **Make your changes** to the codebase
2. **Commit using your existing process** (auto-generated conventional commits work perfectly)

### Creating Releases

#### Option A: Fully Automated (Recommended for most releases)

1. **Auto-generate and release**:
   ```bash
   npm run release
   ```
   This will automatically generate changesets from commits, version packages, and publish.

#### Option B: Manual Changesets (For custom release notes)

1. **Create changeset manually**:
   ```bash
   npm run changeset
   ```
2. **Check changeset status**:
   ```bash
   npm run changeset:status
   ```
3. **Version and release**:
   ```bash
   npm run release:manual
   ```

#### Option C: Review Before Release

1. **Generate changesets from commits**:
   ```bash
   npm run changeset:generate
   ```
2. **Review generated changesets** in `.changeset/` directory
3. **Edit if needed**, then release locally:
   ```bash
   npm run release:manual
   ```

## Available Scripts

| Script                       | Description                                           |
| ---------------------------- | ----------------------------------------------------- |
| `npm run changeset`          | Create a changeset manually                           |
| `npm run changeset:generate` | Auto-generate changesets from commits                 |
| `npm run changeset:status`   | View pending changes                                  |
| `npm run release:dry`        | Preview version changes                               |
| `npm run release:version`    | Bump versions based on changesets                     |
| `npm run release:publish`    | Publish packages to npm                               |
| `npm run release`            | Full automated process (generate + version + publish) |
| `npm run release:manual`     | Manual release process (version + publish only)       |

## Conventional Commit Types

| Type       | Description              | Changeset Type |
| ---------- | ------------------------ | -------------- |
| `feat`     | New feature              | minor          |
| `fix`      | Bug fix                  | patch          |
| `docs`     | Documentation            | patch          |
| `style`    | Code style changes       | patch          |
| `refactor` | Code refactoring         | patch          |
| `perf`     | Performance improvements | patch          |
| `test`     | Test changes             | patch          |
| `build`    | Build system changes     | patch          |
| `ci`       | CI changes               | patch          |
| `chore`    | Maintenance tasks        | patch          |

**Breaking Changes**: Add `!` after type or include `BREAKING CHANGE:` in commit body for major version bumps.

## Package Detection

The auto-generation script intelligently detects which packages are affected:

- Changes in `packages/core/` → affects `@stati/core`
- Changes in `packages/cli/` → affects `@stati/cli`
- Changes in `packages/create-stati/` → affects `create-stati`
- Changes elsewhere → affects all packages

## Best Practices

1. **Ensure your auto-generated commits follow conventional format** for best results
2. **Review generated changesets** before releasing
3. **Test changes locally** before pushing to main
4. **Keep breaking changes minimal** and well-documented
5. **Use semantic versioning** principles

## Troubleshooting

### No changesets generated

- Check that commits follow conventional commit format
- Ensure you're in a git repository with commits
- Verify the script has access to git history

### Local publishing issues

- Ensure you're logged into npm: `npm whoami`
- Check package.json `version` field
- Ensure packages are public (or have correct access settings)
- Verify npm authentication with `npm login`

## Migration Notes

Your existing changesets workflow remains unchanged. New features are additive:

- Existing manual changeset creation still works
- Current release process still works
- New automation is opt-in via new scripts
