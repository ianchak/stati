#!/usr/bin/env node

/**
 * Auto-generate changesets from conventional commits
 * This script parses conventional commits and creates corresponding changesets
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import parser from 'conventional-commits-parser';

// Configuration
const WORKSPACE_PACKAGES = ['@stati/core', '@stati/cli', 'create-stati'];
const CHANGESET_DIR = path.join(process.cwd(), '.changeset');

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
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%H|%s|%b"`, {
      encoding: 'utf8',
    });
    return commits.split('\n').filter(Boolean);
  } catch {
    // If no tags exist, get all commits
    const commits = execSync('git log --pretty=format:"%H|%s|%b"', { encoding: 'utf8' });
    return commits.split('\n').filter(Boolean);
  }
}

function parseCommit(commitLine) {
  const [hash, subject, body] = commitLine.split('|');
  const fullMessage = `${subject}\n\n${body || ''}`;

  const parsed = parser.sync(fullMessage);
  return {
    hash: hash.substring(0, 7),
    ...parsed,
  };
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
  // Simple heuristic: check which packages are affected based on file changes
  try {
    const changedFiles = execSync(`git show --name-only ${commit.hash}`, { encoding: 'utf8' });
    const packages = [];

    if (changedFiles.includes('packages/core/')) packages.push('@stati/core');
    if (changedFiles.includes('packages/cli/')) packages.push('@stati/cli');
    if (changedFiles.includes('packages/create-stati/')) packages.push('create-stati');

    // If no specific package is detected, assume all packages are affected
    return packages.length > 0 ? packages : WORKSPACE_PACKAGES;
  } catch {
    // Fallback to all packages
    return WORKSPACE_PACKAGES;
  }
}

function generateChangesetId() {
  const adjectives = ['happy', 'silly', 'brave', 'calm', 'eager', 'fair', 'gentle', 'kind'];
  const nouns = ['cat', 'dog', 'bird', 'fish', 'bear', 'wolf', 'fox', 'deer'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective}-${randomNoun}-${Date.now().toString(36)}`;
}

function createChangeset(commit, changesetType, affectedPackages) {
  const changesetId = generateChangesetId();
  const filename = `${changesetId}.md`;
  const filepath = path.join(CHANGESET_DIR, filename);

  // Generate changeset content
  const packageChanges = affectedPackages.map((pkg) => `"${pkg}": ${changesetType}`).join('\n');

  const changesetContent = `---
${packageChanges}
---

${commit.subject}

${commit.body || ''}

Commit: ${commit.hash}
`;

  fs.writeFileSync(filepath, changesetContent);
  console.log(`Created changeset: ${filename}`);
  return filename;
}

function main() {
  console.log('🔍 Analyzing commits for changeset generation...');

  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    console.error('❌ Not in a git repository');
    process.exit(1);
  }

  // Ensure .changeset directory exists
  if (!fs.existsSync(CHANGESET_DIR)) {
    console.error('❌ .changeset directory not found. Make sure changesets is initialized.');
    process.exit(1);
  }

  const commits = getCommitsSinceLastTag();

  if (commits.length === 0) {
    console.log('✅ No new commits found');
    return;
  }

  console.log(`📝 Found ${commits.length} commits to analyze`);

  let generatedChangesets = 0;

  for (const commitLine of commits) {
    const commit = parseCommit(commitLine);

    // Skip commits that are not conventional or are changeset commits
    if (!commit.type || commit.subject.includes('chore: release packages')) {
      continue;
    }

    const changesetType = determineChangesetType(commit);
    const affectedPackages = determineAffectedPackages(commit);

    console.log(
      `📦 ${commit.type}(${commit.scope || 'general'}): ${commit.subject} -> ${changesetType}`,
    );

    createChangeset(commit, changesetType, affectedPackages);
    generatedChangesets++;
  }

  console.log(`✅ Generated ${generatedChangesets} changesets`);

  if (generatedChangesets > 0) {
    console.log('\n💡 Next steps:');
    console.log('1. Review the generated changesets in .changeset/');
    console.log('2. Edit them if needed');
    console.log('3. Run "npm run changeset:status" to see pending changes');
    console.log('4. Run "npm run release:version" to bump versions');
  }
}

export { main, parseCommit, determineChangesetType, determineAffectedPackages };

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
