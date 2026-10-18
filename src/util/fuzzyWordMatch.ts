/** True if the character at index i of the label begins a word: the first character, or one that follows a character that is not a letter or digit. */
const isWordStart = (label: string, i: number) => i === 0 || !/[\p{L}\p{N}]/u.test(label[i - 1])

/**
 * Matches a search query against a label, case-insensitively, and returns the indices of the label characters that matched, or null if it does not match. Spaces in the query are ignored. The label matches if either:
 *
 * - The query appears in it contiguously, e.g. "thought" in "New Subthought".
 * - Each character of the query matches in order, and every character that does not directly follow the previous match falls at the start of a word, e.g. "net" in "NEw Thought" or "nsub" in "New SUBthought". This is what keeps the matching from being too fuzzy: "net" does not match "Close Command Center", whose letters are scattered through its words.
 *
 * Adding a character to a query can only remove matches, never add them, so results filter down as the user types.
 */
const fuzzyWordMatch = (label: string, query: string): number[] | null => {
  const lowerLabel = label.toLowerCase()
  const chars = query.toLowerCase().replace(/\s+/g, '')
  if (!chars) return []

  const substringIndex = lowerLabel.indexOf(query.trim().toLowerCase())
  // Only a query without inner spaces takes this shortcut, since it counts its matched indices from chars, which has the spaces stripped. A query with spaces still matches through the word-start search below, which skips them.
  if (substringIndex !== -1 && !/\s/.test(query.trim())) {
    return Array.from({ length: chars.length }, (_, i) => substringIndex + i)
  }

  /** Matches chars[q:] against the label after index prev, the last matched index, backtracking when a choice dead-ends. */
  const matchFrom = (q: number, prev: number): number[] | null => {
    if (q === chars.length) return []
    // Either continue the current run, or jump to the start of a later word.
    const candidates = [
      ...(prev >= 0 && lowerLabel[prev + 1] === chars[q] ? [prev + 1] : []),
      ...[...lowerLabel]
        .map((char, i) => i)
        // prev + 1 is the continuation above, so a jump has to land beyond it. The first character has nothing to continue, so it may land anywhere.
        .filter(i => (prev < 0 || i > prev + 1) && lowerLabel[i] === chars[q] && isWordStart(label, i)),
    ]
    return candidates.reduce<number[] | null>((found, i) => {
      if (found) return found
      const rest = matchFrom(q + 1, i)
      return rest ? [i, ...rest] : null
    }, null)
  }

  return matchFrom(0, -1)
}

export default fuzzyWordMatch
