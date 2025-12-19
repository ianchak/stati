#!/usr/bin/env node

/**
 * Auto-generate changesets from conventional commits
 * This script parses conventional commits and creates corresponding changesets
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Configuration
const WORKSPACE_PACKAGES = ['@stati/core', '@stati/cli', 'create-stati'];
const CHANGESET_DIR = path.join(process.cwd(), '.changeset');

// Patterns for commits to skip
const SKIP_COMMIT_PATTERNS = [
  /^chore: version packages/i,
  /^chore: release/i,
  /\[skip ci\]/i,
  /\[skip changeset\]/i,
  /^Merge pull request/,
  /^Merge branch/,
  /^chore: add auto-generated changeset/i,
  /^Update .+ from .+/, // Dependabot commits
];

// Workspace root files that affect all packages
const WORKSPACE_ROOT_FILES = [
  'package.json',
  'tsconfig.base.json',
  'vitest.config.ts',
  'eslint.config.mjs',
];

// Files that should not trigger changesets on their own
const NON_PACKAGE_FILES = [
  '.github/',
  'docs-site/',
  'examples/',
  'scripts/',
  '.changeset/',
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'package-lock.json', // Lock file changes alone don't require changesets
];

// Map conventional commit types to changeset types
const COMMIT_TYPE_TO_CHANGESET = {
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  revert: 'patch',
  docs: 'patch',
  style: 'patch',
  refactor: 'patch',
  test: 'patch',
  build: 'patch',
  ci: 'patch',
  chore: 'patch',
  breaking: 'major',
  'BREAKING CHANGE': 'major',
};

function getCommitsSinceLastTag() {
  try {
    // Check if we're in a PR context (GitHub Actions)
    const baseBranch = process.env.GITHUB_BASE_REF;
    const headBranch = process.env.GITHUB_HEAD_REF;

    if (baseBranch && headBranch) {
      console.log(`PR context detected: ${headBranch} -> ${baseBranch}`);
      const commits = execSync(
        `git log origin/${baseBranch}..${headBranch} --pretty=format:"%H|%s|%b"`,
        { encoding: 'utf8' },
      );
      return commits.split('\n').filter(Boolean);
    } // Otherwise, get commits since last tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    console.log(`Using commits since tag: ${lastTag}`);
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%H|%s|%b"`, {
      encoding: 'utf8',
    });
    return commits.split('\n').filter(Boolean);
  } catch {
    // If no tags exist, get all commits
    console.log('No tags found, analyzing all commits');
    const commits = execSync('git log --pretty=format:"%H|%s|%b"', { encoding: 'utf8' });
    return commits.split('\n').filter(Boolean);
  }
}

function parseCommit(commitLine) {
  const parts = commitLine.split('|');
  const hash = parts[0];
  const subject = parts[1] || '';
  const body = parts[2] || '';

  // Simple regex-based parsing for conventional commits
  // Pattern: type(scope): description or type: description
  // Also supports type!: for breaking changes (e.g., "feat!: breaking change")
  //
  // BREAKING CHANGE DETECTION:
  // This parser detects breaking changes in two ways:
  // 1. The "!" marker after the type: feat!, fix!, chore!, etc.
  // 2. The text "BREAKING CHANGE" anywhere in the commit body
  //
  // Note: This follows the Conventional Commits v1.0.0 specification.
  // Other formats (e.g., "BREAKING:" prefix) are not supported and will be
  // treated as regular commits. If you need custom breaking change detection,
  // modify the isBreaking check below.
  const conventionalPattern = /^(\w+)(!)?(?:\(([^)]+)\))?: (.+)/;
  const match = subject.match(conventionalPattern);

  if (match) {
    const [, type, breakingMarker, scope, description] = match;

    // Check for breaking changes (! marker or BREAKING CHANGE in body)
    const isBreaking = breakingMarker === '!' || body.includes('BREAKING CHANGE');

    return {
      hash: hash.substring(0, 7),
      fullHash: hash,
      type,
      scope: scope || null,
      subject: description,
      body: body || '',
      notes: isBreaking ? [{ title: 'BREAKING CHANGE', text: body }] : [],
      raw: subject,
    };
  }

  // Fallback for non-conventional commits
  return {
    hash: hash.substring(0, 7),
    fullHash: hash,
    type: null,
    scope: null,
    subject,
    body: body || '',
    notes: [],
    raw: subject,
  };
}

function shouldSkipCommit(commit) {
  return SKIP_COMMIT_PATTERNS.some((pattern) => pattern.test(commit.raw || commit.subject));
}

function determineChangesetType(commit) {
  // Check for breaking changes
  if (commit.notes && commit.notes.some((note) => note.title === 'BREAKING CHANGE')) {
    return 'major';
  }

  // Map commit type to changeset type
  return COMMIT_TYPE_TO_CHANGESET[commit.type] || 'patch';
}

function determineAffectedPackages(commit) {
  try {
    // Use git diff-tree for more reliable file detection
    const changedFiles = execSync(
      `git diff-tree --no-commit-id --name-only -r ${commit.fullHash}`,
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean);

    const packages = new Set();
    let hasWorkspaceRootChanges = false;

    for (const file of changedFiles) {
      // Check for package-specific changes
      if (file.startsWith('packages/core/')) {
        packages.add('@stati/core');
      }
      if (file.startsWith('packages/cli/')) {
        packages.add('@stati/cli');
      }
      if (file.startsWith('packages/create-stati/')) {
        packages.add('create-stati');
      }

      // Check for workspace root changes that affect all packages
      if (WORKSPACE_ROOT_FILES.some((rootFile) => file === rootFile)) {
        console.log(`  Workspace root file changed: ${file} - affecting all packages`);
        hasWorkspaceRootChanges = true;
      }
    }

    // If workspace root files changed, return all packages
    if (hasWorkspaceRootChanges) {
      return WORKSPACE_PACKAGES;
    }

    // Check if only non-package files changed
    const onlyNonPackageFiles = changedFiles.every((file) => {
      return NON_PACKAGE_FILES.some((pattern) => {
        if (pattern.endsWith('/')) {
          return file.startsWith(pattern);
        }
        return file === pattern || file.endsWith('.md');
      });
    });

    if (onlyNonPackageFiles && packages.size === 0) {
      console.log(`  Only non-package files changed - skipping changeset`);
      return null; // Signal to skip this commit
    }

    // If specific packages detected, return them
    if (packages.size > 0) {
      return Array.from(packages);
    }

    // Default: affect all packages (conservative approach)
    console.log(`  Could not determine specific packages - affecting all`);
    return WORKSPACE_PACKAGES;
  } catch (error) {
    console.error(`Error determining affected packages:`, error);
    // Fallback to all packages
    return WORKSPACE_PACKAGES;
  }
}

function generateChangesetId() {
  const adjectives = [
    'happy',
    'silly',
    'brave',
    'calm',
    'eager',
    'fair',
    'gentle',
    'kind',
    'proud',
    'witty',
    'wise',
    'clever',
    'bright',
    'swift',
  ];
  const nouns = [
    'cat',
    'dog',
    'bird',
    'fish',
    'bear',
    'wolf',
    'fox',
    'deer',
    'lion',
    'tiger',
    'panda',
    'owl',
    'hawk',
    'eagle',
  ];
  const verbs = [
    'jumps',
    'runs',
    'flies',
    'swims',
    'dances',
    'sings',
    'laughs',
    'plays',
    'sleeps',
    'dreams',
  ];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];

  // Add timestamp suffix to guarantee uniqueness even with same random words
  // Format: adjective-noun-verb-timestamp (e.g., happy-cat-jumps-k2j5x9)
  const timestamp = Date.now().toString(36);

  return `${randomAdjective}-${randomNoun}-${randomVerb}-${timestamp}`;
}

function createChangeset(commit, changesetType, affectedPackages) {
  const changesetId = generateChangesetId();
  const filename = `${changesetId}.md`;
  const filepath = path.join(CHANGESET_DIR, filename);

  // Generate changeset content
  const packageChanges = affectedPackages.map((pkg) => `"${pkg}": ${changesetType}`).join('\n');

  // Clean up subject and body for better readability
  const cleanSubject = commit.subject.trim();
  const cleanBody = commit.body ? commit.body.trim() : '';

  // Add breaking change notice
  const breakingNotice =
    commit.notes.length > 0
      ? '\n\n**BREAKING CHANGE**\n\nThis is a breaking change that requires attention during upgrade.\n'
      : '';

  const changesetContent = `---
${packageChanges}
---

${cleanSubject}
${cleanBody ? `\n${cleanBody}` : ''}${breakingNotice}
`;

  fs.writeFileSync(filepath, changesetContent.trim() + '\n');
  console.log(`  Created changeset: ${filename}`);
  return filename;
}

function main() {
  console.log('Analyzing commits for changeset generation...');

  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    console.error('Not in a git repository');
    process.exit(1);
  }

  // Ensure .changeset directory exists
  if (!fs.existsSync(CHANGESET_DIR)) {
    console.error('.changeset directory not found. Make sure changesets is initialized.');
    process.exit(1);
  }

  let commits;
  try {
    commits = getCommitsSinceLastTag();
  } catch (error) {
    console.error('Error getting commits:', error);
    process.exit(1);
  }
  if (commits.length === 0) {
    console.log('No new commits found');
    return;
  }

  console.log(`Found ${commits.length} commits to analyze:`);
  commits.forEach((commit, i) => {
    const parts = commit.split('|');
    const hash = parts[0] || '';
    const subject = parts[1] || '';
    console.log(`  ${i + 1}. ${hash.substring(0, 7)} - ${subject}`);
  });

  console.log('\nProcessing commits...\n');
  let generatedChangesets = 0;
  let skippedCommits = 0;

  for (const commitLine of commits) {
    const commit = parseCommit(commitLine);

    // Skip commits based on patterns
    if (shouldSkipCommit(commit)) {
      console.log(`Skipping: ${commit.hash} - ${commit.subject}`);
      console.log(`   Reason: Matches skip pattern`);
      skippedCommits++;
      continue;
    }

    // Skip commits without a conventional type
    if (!commit.type) {
      console.log(`Skipping: ${commit.hash} - ${commit.subject}`);
      console.log(`   Reason: Not a conventional commit`);
      skippedCommits++;
      continue;
    }

    const changesetType = determineChangesetType(commit);
    const affectedPackages = determineAffectedPackages(commit);

    // Skip if no packages affected (e.g., docs-only changes)
    if (!affectedPackages || affectedPackages.length === 0) {
      console.log(`Skipping: ${commit.hash} - ${commit.subject}`);
      console.log(`   Reason: No packages affected`);
      skippedCommits++;
      continue;
    }

    console.log(`\nProcessing: ${commit.type}(${commit.scope || 'general'}): ${commit.subject}`);
    console.log(`   Version bump: ${changesetType}`);
    console.log(`   Packages: ${affectedPackages.join(', ')}`);

    createChangeset(commit, changesetType, affectedPackages);
    generatedChangesets++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generated ${generatedChangesets} changeset${generatedChangesets !== 1 ? 's' : ''}`);
  console.log(`Skipped ${skippedCommits} commit${skippedCommits !== 1 ? 's' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  if (generatedChangesets > 0) {
    console.log('Next steps:');
    console.log('1. Review the generated changesets in .changeset/');
    console.log('2. Edit them if needed (adjust version type or description)');
    console.log('3. Run "npm run changeset:status" to see pending changes');
    console.log('4. Commit and push to continue');
  } else {
    console.log('Tips for generating changesets:');
    console.log('- Use conventional commits: feat:, fix:, chore:, etc.');
    console.log('- Make changes to package files (not just docs/examples)');
    console.log('- Or create changesets manually: npm run changeset');
  }
}

export { main, parseCommit, determineChangesetType, determineAffectedPackages, shouldSkipCommit };

// Run main if this is the entry point
if (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith('generate-changesets.mjs')
) {
  main();
}
