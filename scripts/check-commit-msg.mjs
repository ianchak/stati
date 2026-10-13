#!/usr/bin/env node

/**
 * commit-msg hook: allow only a single-line subject.
 *
 * scripts/generate-changesets.mjs reads `git log` line by line, so every body
 * line is treated as a separate commit. Body text gets cut from the changeset,
 * and a body line shaped like `type: subject` produces a spurious changeset.
 *
 * Nothing may follow the subject: no body, no trailers, no closing keywords.
 * Link issues from the PR description instead.
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

  return rest;
}

function main() {
  const messageFile = process.argv[2];
  if (!messageFile) {
    console.error('Usage: check-commit-msg.mjs <commit-msg-file>');
    process.exit(1);
  }

  const offending = checkCommitMessage(fs.readFileSync(messageFile, 'utf8'));
  if (offending.length === 0) return;

  console.error('Commit message rejected: use a single-line subject with nothing after it.\n');
  console.error('Unexpected lines after the subject:');
  for (const line of offending) {
    console.error(`  ${line}`);
  }
  console.error(
    '\nPut the details, issue links (`Closes #123`), and co-author credits in the PR' +
      '\ndescription. Trailers like `Co-Authored-By: ...` are not allowed either.' +
      '\nMark breaking changes with `!` (`feat(core)!: ...`), not a `BREAKING CHANGE:` footer.',
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
