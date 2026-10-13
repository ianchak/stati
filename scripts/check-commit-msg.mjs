#!/usr/bin/env node

/**
 * commit-msg hook: allow only a single-line subject plus trailers.
 *
 * scripts/generate-changesets.mjs reads `git log` line by line, so every body
 * line is treated as a separate commit. Body text gets cut from the changeset,
 * and a body line shaped like `type: subject` produces a spurious changeset.
 *
 * Allowed after the subject:
 * - Trailers with a hyphenated key (`Co-Authored-By: ...`, `Signed-off-by: ...`).
 *   The hyphen keeps them from matching the conventional commit pattern.
 * - GitHub closing keywords (`Closes #123`, `Fixes #45`).
 */

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Machine-generated or git-generated messages that legitimately carry a body
const EXEMPT_SUBJECT_PATTERNS = [
  /^RELEASING: /, // `changeset version` with `commit: true` in CI
  /^Merge /,
  /^Revert "/,
  /^(fixup|squash|amend)! /,
];

const TRAILER_PATTERN = /^[A-Za-z]+(?:-[A-Za-z]+)+: \S/;
const CLOSING_KEYWORD_PATTERN = /^(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) #\d+$/i;
const SCISSORS_LINE = /^# -+ >8 -+$/;

export function checkCommitMessage(message) {
  const lines = [];
  for (const line of message.split(/\r?\n/)) {
    // Everything below the scissors line is the `git commit -v` diff
    if (SCISSORS_LINE.test(line)) break;
    if (line.startsWith('#')) continue;
    lines.push(line.trimEnd());
  }

  const [subject = '', ...rest] = lines.filter((line) => line !== '');

  if (EXEMPT_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))) {
    return [];
  }

  return rest.filter((line) => !TRAILER_PATTERN.test(line) && !CLOSING_KEYWORD_PATTERN.test(line));
}

function main() {
  const messageFile = process.argv[2];
  if (!messageFile) {
    console.error('Usage: check-commit-msg.mjs <commit-msg-file>');
    process.exit(1);
  }

  const offending = checkCommitMessage(fs.readFileSync(messageFile, 'utf8'));
  if (offending.length === 0) return;

  console.error('Commit message rejected: use a single-line subject with no body.\n');
  console.error('Unexpected lines after the subject:');
  for (const line of offending) {
    console.error(`  ${line}`);
  }
  console.error(
    '\nPut the details in the PR description. Only trailers like `Co-Authored-By: ...`' +
      '\nand closing keywords like `Closes #123` may follow the subject.' +
      '\nMark breaking changes with `!` (`feat(core)!: ...`), not a `BREAKING CHANGE:` footer.',
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
