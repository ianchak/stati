/**
 * String similarity helpers used to build "did you mean" suggestions.
 */

/**
 * Computes the edit distance between two strings, counting insertions,
 * deletions, substitutions, and transpositions of adjacent characters
 * (optimal string alignment distance).
 *
 * @example
 * ```typescript
 * editDistance('paeg', 'page'); // 1 (transposition)
 * editDistance('titel', 'title'); // 1
 * ```
 */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) {
    d[0]![j] = j;
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = value;
    }
  }

  return d[a.length]![b.length]!;
}

/**
 * Finds the candidates that look like a misspelling of `target`, best match first.
 *
 * A candidate matches when its case-insensitive edit distance to the target is at
 * most a third of the target's length (minimum 1), or when one is a prefix of the
 * other and both are at least 3 characters long.
 *
 * @param target - The name that was not found
 * @param candidates - The names that do exist
 * @param limit - Maximum number of suggestions to return
 *
 * @example
 * ```typescript
 * findSimilarNames('paeg', ['page', 'partials', 'site']); // ['page']
 * findSimilarNames('head', ['header', 'hero', 'footer']); // ['header']
 * ```
 */
export function findSimilarNames(
  target: string,
  candidates: Iterable<string>,
  limit = 3,
): string[] {
  const normalizedTarget = target.toLowerCase();
  const maxDistance = Math.max(1, Math.floor(normalizedTarget.length / 3));

  const matches: Array<{ name: string; score: number }> = [];
  for (const name of new Set(candidates)) {
    const candidate = name.toLowerCase();
    const distance = editDistance(normalizedTarget, candidate);
    const isPrefix =
      Math.min(candidate.length, normalizedTarget.length) >= 3 &&
      (candidate.startsWith(normalizedTarget) || normalizedTarget.startsWith(candidate));

    if (distance <= maxDistance || isPrefix) {
      // Prefix matches win ties against plain edit-distance matches
      matches.push({ name, score: distance - (isPrefix ? 0.5 : 0) });
    }
  }

  return matches
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((match) => match.name);
}
