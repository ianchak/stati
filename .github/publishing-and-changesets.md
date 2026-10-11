---
title: 'Publishing and Changesets'
description: 'Comprehensive guide to Stati package publishing workflow, changeset generation, and release automation using GitHub Actions and npm OIDC.'
---

Stati uses an automated publishing workflow built on Changesets for version management and GitHub Actions for continuous delivery. This guide explains how the entire publishing pipeline works, from commit to npm release.

## Overview

The publishing process follows these stages:

1. **Development** - Contributors make changes using conventional commits
2. **Changeset Generation** - Automated bot creates changesets from commits
3. **Pull Request Review** - Changesets are reviewed and potentially edited
4. **Version Bump** - Changesets update package versions and changelogs
5. **Publishing** - Packages are published to npm using OIDC authentication
6. **Tag and Release** - Git tags are created and pushed

## Conventional Commits

Stati uses the Conventional Commits specification to automatically determine version bumps and generate changelogs.

### Commit Format

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

### Supported Types

- **feat** - New feature (minor version bump)
- **fix** - Bug fix (patch version bump)
- **perf** - Performance improvement (patch version bump)
- **docs** - Documentation changes (patch version bump)
- **style** - Code style changes (patch version bump)
- **refactor** - Code refactoring (patch version bump)
- **test** - Test additions or modifications (patch version bump)
- **build** - Build system changes (patch version bump)
- **ci** - CI/CD changes (patch version bump)
- **chore** - Other changes (patch version bump)

### Breaking Changes

Breaking changes trigger a major version bump and can be indicated in two ways:

1. **Exclamation mark** after the type:

   ```text
   feat!: redesigned template API
   ```

2. **BREAKING CHANGE** in the commit body:

   ```text
   feat: add new configuration system

   BREAKING CHANGE: Configuration format has changed.
   Old configs must be migrated to the new structure.
   ```

### Examples

```bash
# Minor version bump
feat: add markdown syntax highlighting
feat(core): implement incremental builds

# Patch version bump
fix: resolve template caching issue
docs: update installation guide

# Major version bump
feat!: redesign configuration API
fix!: change default output directory
```

## Changeset Generation

Changesets are markdown files that describe changes and specify which packages should be versioned. Stati automates their creation using a Node.js script.

### Automatic Generation Script

The `scripts/generate-changesets.mjs` script analyzes commits and creates changesets automatically.

**Key Features:**

- Parses conventional commits between tags or in pull requests
- Determines affected packages based on changed files
- Maps commit types to version bump types
- Handles breaking changes
- Generates unique changeset IDs
- Skips non-package changes (docs, examples)

**Running Manually:**

```bash
npm run changeset:generate
```

**What It Does:**

1. Finds commits since the last tag or between base and head branches
2. Parses each commit for conventional format
3. Determines which packages are affected
4. Creates `.changeset/*.md` files with version bumps
5. Reports generation statistics

### Affected Package Detection

The script determines which packages need versioning based on file paths:

**Package-Specific Changes:**

- `packages/core/` → `@stati/core`
- `packages/cli/` → `@stati/cli`
- `packages/create-stati/` → `create-stati`

**Workspace Root Changes:**

Changes to these files affect all packages:

- `package.json`
- `package-lock.json`
- `tsconfig.base.json`
- `vitest.config.ts`
- `eslint.config.mjs`

**Skipped Changes:**

Changes to these locations do not trigger package versions:

- `.github/` (CI configuration)
- `docs-site/` (documentation site)
- `examples/` (example projects)
- `README.md`, `LICENSE`, `CONTRIBUTING.md`

### Changeset File Format

Generated changesets follow this structure:

```markdown
---
"@stati/core": patch
"@stati/cli": patch
---

Add markdown syntax highlighting

Implements syntax highlighting for code blocks
in markdown files using Prism.js integration.
```

**Breaking Change Example:**

```markdown
---
"@stati/core": major
---

Redesign configuration API

BREAKING CHANGE

This is a breaking change that requires attention during upgrade.
```

## Changeset Bot Workflow

The Changeset Bot runs automatically on pull requests to ensure proper version tracking.

### Trigger Conditions

The bot runs when:

- A pull request is opened
- New commits are pushed to a PR
- A PR is reopened
- Labels are added or removed

### Bot Behavior

#### 1. Check for Existing Changesets

The bot first checks if the PR already has changesets in `.changeset/`.

#### 2. Generate if Missing

If no changeset exists, it attempts to generate one from conventional commits.

#### 3. Commit and Comment

- Commits the generated changeset to the PR branch
- Adds a comment explaining what was created
- Provides guidance for next steps

#### 4. Skip Conditions

The bot skips processing if:

- The PR has the `skip-changeset` label
- The PR is from a fork (security)
- A changeset already exists

### Bot Comments

**Success - Changeset Generated:**

```text
Auto-generated changeset added!

I analyzed your commits using conventional commit patterns
and created a changeset.

Generated files:
- .changeset/happy-cat-jumps-k2j5x9.md

What to do next:
1. Review the changeset file(s) above
2. Edit if needed (adjust version bump type or description)
3. Commit any changes to this PR
4. Merge when ready
```

**No Conventional Commits:**

```text
No changeset detected

I couldn't find or generate a changeset for this PR.

Possible reasons:
- No conventional commits found
- Only non-functional changes (docs, tests, etc.)

What to do:
1. If this PR should release packages:
   - Create a changeset manually: npm run changeset
   - Or use conventional commits
2. If no release is needed:
   - Add the skip-changeset label to this PR
```

### Skipping the Bot

To skip changeset generation for a PR:

1. Add the `skip-changeset` label
2. Or include `[skip changeset]` in a commit message

**When to Skip:**

- Documentation-only changes
- Test updates without functional changes
- CI/CD configuration changes
- Example project updates
- Internal refactoring without API changes

## Publishing Workflow

Publishing is fully automated through GitHub Actions when changes are merged to the `main` branch.

### Trigger Flow

```text
PR Merged to main
    ↓
CI Workflow Runs
    ↓
CI Passes Successfully
    ↓
Publish Workflow Triggered
    ↓
Packages Published to npm
```

### npm OIDC Authentication

Stati uses npm Trusted Publishers with OpenID Connect (OIDC) for secure authentication.

**Why OIDC?**

- npm is sunsetting classic authentication tokens
- Granular tokens have limited lifetimes
- OIDC provides secure, automatic authentication
- No secrets management required

**Requirements:**

- npm version 11.5.1 or higher
- GitHub Actions `id-token: write` permission
- Package configured as Trusted Publisher on npm

**How It Works:**

1. GitHub Actions requests an OIDC token
2. npm verifies the token against configured Trusted Publishers
3. Authentication succeeds without manual tokens
4. Packages are published with provenance

### Publish Workflow Steps

#### 1. Prerequisites Check

```yaml
- CI workflow must complete successfully
- Repository must be on main branch
- npm version must be 11.5.1+
```

#### 2. Build Packages

```bash
npm ci
npm run build
```

All three packages are built in dependency order: `core` → `cli` → `create-stati`.

#### 3. Check for Changesets

The workflow checks for changeset files in `.changeset/`:

```bash
if [ -n "$(ls -A .changeset/*.md 2>/dev/null | grep -v README)" ]; then
  # Changesets exist
else
  # No changesets
fi
```

#### 4. Auto-Generate Fallback

If no changesets exist, the workflow attempts to generate them:

```bash
node scripts/generate-changesets.mjs
```

This handles cases where:

- Conventional commits were used but no changeset was created
- The bot was skipped but changes warrant a release
- Manual changesets were forgotten

#### 5. Version Packages

Changesets updates package versions and generates changelogs:

```bash
npx changeset version
```

This modifies:

- `package.json` files with new versions
- `CHANGELOG.md` files with release notes
- Removes consumed changeset files

#### 6. Commit Version Changes

```bash
git add .
git commit -m "chore: version packages [skip ci]"
```

The `[skip ci]` tag prevents infinite CI loops.

#### 7. Publish to npm

```bash
npx changeset publish
```

Changesets publishes all packages with updated versions using OIDC authentication.

#### Retry Logic

The workflow includes retry logic for network resilience:

```bash
MAX_RETRIES=3
# Retry publish if network issues occur
```

#### 8. Push Tags

```bash
git push --follow-tags
```

Git tags are created for each published version and pushed to GitHub.

### Concurrency Control

The workflow prevents concurrent publish runs:

```yaml
concurrency:
  group: publish-${{ github.ref }}
  cancel-in-progress: false
```

This avoids race conditions when multiple PRs are merged quickly.

## Manual Changeset Creation

While automated generation is preferred, manual changesets can be created when needed.

### Interactive Creation

```bash
npm run changeset
```

This launches an interactive prompt:

1. Select packages to version
2. Choose version bump type (major/minor/patch)
3. Write a description of changes
4. Changeset file is created

### Manual File Creation

You can also create changeset files manually:

```bash
# Create a new file in .changeset/
touch .changeset/my-feature-change.md
```

**File Content:**

```markdown
---
"@stati/core": minor
"@stati/cli": patch
---

Add new feature with CLI integration

Detailed description of changes...
```

### Changeset Guidelines

**Good Changeset Descriptions:**

- Explain what changed from a user perspective
- Include migration steps for breaking changes
- Link to relevant documentation or issues
- Use clear, concise language

**Example:**

```markdown
---
"@stati/core": minor
---

Add support for custom markdown plugins

You can now extend Stati's markdown processing with custom
remark/rehype plugins via the configuration file.

See the markdown configuration docs for usage examples.
```

## Version Management

Stati follows semantic versioning (semver) strictly:

- **Major** (x.0.0) - Breaking changes, incompatible API changes
- **Minor** (0.x.0) - New features, backward-compatible additions
- **Patch** (0.0.x) - Bug fixes, backward-compatible fixes

### Version Bump Rules

**Automatic Determination:**

- `feat` commits → minor bump
- `fix` commits → patch bump
- `feat!` or `BREAKING CHANGE` → major bump

**Manual Override:**

Edit the changeset file to change the version bump type:

```markdown
---
"@stati/core": major  # Changed from minor
---
```

### Pre-Release Versions

For alpha/beta releases, use changeset prerelease mode:

```bash
# Enter prerelease mode
npx changeset pre enter alpha

# Generate versions (will be x.x.x-alpha.0)
npm run changeset:version

# Exit prerelease mode
npx changeset pre exit
```

## Changeset Commands

### Status Check

View pending changes without publishing:

```bash
npm run changeset:status
```

Output shows:

- Which packages will be versioned
- What version bumps will occur
- Current and next version numbers

### Dry Run

Preview version changes without committing:

```bash
npm run changeset:dry-run
```

This shows exactly what would happen during versioning.

### Emergency Release

For critical hotfixes, bypass normal flow:

```bash
npm run release:emergency
```

This command:

1. Builds all packages
2. Runs changeset version
3. Publishes to npm
4. Pushes tags

**Use only for urgent production fixes.**

## Troubleshooting

### No Changesets Generated

**Problem:** The script doesn't create changesets.

**Solutions:**

- Use conventional commit format
- Make changes to package files (not just docs)
- Check that commits aren't in the skip list
- Review the script output for reasons

### Wrong Package Affected

**Problem:** Changeset affects incorrect packages.

**Solutions:**

- Edit the changeset file manually
- Ensure file paths match package locations
- Review the affected package detection logic

### Version Bump Too Small/Large

**Problem:** Major change gets patch bump or vice versa.

**Solutions:**

- Edit the changeset file to correct version type
- Use `feat!:` or `BREAKING CHANGE` for major bumps
- Review conventional commit format

### OIDC Authentication Failed

**Problem:** npm publish fails with authentication error.

**Solutions:**

- Verify npm version is 11.5.1 or higher
- Check Trusted Publishers configuration on npm
- Ensure `id-token: write` permission is set
- Review GitHub Actions logs for token issues

### Publish Workflow Skipped

**Problem:** Workflow doesn't run after merge.

**Solutions:**

- Ensure CI workflow passed successfully
- Check that branch is `main`
- Verify workflow trigger conditions
- Look for concurrency conflicts

## Best Practices

### For Contributors

1. **Use conventional commits** for automatic changeset generation
2. **Review generated changesets** before merging PRs
3. **Edit descriptions** to be user-friendly
4. **Mark breaking changes** explicitly with `!` or `BREAKING CHANGE`
5. **Skip changesets** only for non-functional changes

### For Maintainers

1. **Review changesets carefully** during PR review
2. **Verify version bump types** are appropriate
3. **Edit changeset descriptions** for clarity
4. **Test locally** before merging to main
5. **Monitor publish workflow** for failures
6. **Use pre-releases** for experimental features

### Commit Message Tips

**Good:**

```bash
feat(core): add incremental build support
fix(cli): resolve path resolution on Windows
docs: update API reference for hooks
```

**Bad:**

```bash
update stuff
fixed bug
changes
```

## Workflow Files

The publishing system uses these GitHub Actions workflows:

### `.github/workflows/changeset-bot.yml`

- Runs on pull requests
- Generates changesets automatically
- Comments on PRs with guidance
- Commits changesets to PR branches

### `.github/workflows/publish.yml`

- Runs after CI passes on main
- Versions packages with changesets
- Publishes to npm with OIDC
- Creates and pushes git tags

### `.github/workflows/ci.yml`

- Tests, lints, and type-checks code
- Required to pass before publish
- Runs on all PRs and main branch

## Configuration Files

### `.changeset/config.json`

Changesets configuration:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/changelog-github",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Key Settings:**

- `changelog` - Uses GitHub releases for changelog
- `access: "public"` - Packages are public on npm
- `baseBranch: "main"` - Primary branch for releases
- `updateInternalDependencies` - Bumps dependent packages

### `scripts/generate-changesets.mjs`

Automated changeset generation logic:

- Commit parsing
- Package detection
- Version type mapping
- Changeset file creation

## FAQ

**Q: Can I publish without a changeset?**

A: No. Changesets are required for version tracking and changelog generation. The workflow will attempt to generate one automatically, but manual creation is better.

**Q: How do I skip a package in a changeset?**

A: Simply omit it from the changeset frontmatter. Only listed packages will be versioned.

**Q: Can I edit a changeset after generation?**

A: Yes! Edit the `.changeset/*.md` file before merging. You can change version types and descriptions.

**Q: What happens if I merge without a changeset?**

A: The publish workflow will try to auto-generate one. If it can't, no packages will be published.

**Q: How do I handle monorepo dependencies?**

A: Changesets automatically handles internal dependencies. When you version one package, dependent packages are updated based on the `updateInternalDependencies` setting.

**Q: Can I preview what will be published?**

A: Yes, use `npm run changeset:status` or `npm run changeset:dry-run` to see pending changes.

**Q: How do I publish a specific package only?**

A: Create a changeset that only lists that package in the frontmatter.

**Q: What if the publish workflow fails?**

A: Check the workflow logs in GitHub Actions. Common issues are authentication, build failures, or network problems. Fix the issue and re-run the workflow, or use `npm run release:emergency` for manual publishing.

## Related Documentation

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
