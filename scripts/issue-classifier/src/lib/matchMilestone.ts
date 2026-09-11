/**
 * Normalizes a milestone title to a comparison key: `&` becomes `and`, then everything that is not
 * a letter or digit is removed and the rest lowercased. This absorbs the differences a model
 * actually produces — a dropped or substituted leading emoji, `and` for `&`, stray punctuation,
 * inconsistent spacing — without any per-milestone configuration.
 */
const normalize = (title: string): string =>
  title
    .replace(/&/g, 'and')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/**
 * Resolves one candidate string against the open milestone titles, widening in three stages —
 * exact, case-insensitive, then normalized — so an exact answer is never overridden by a looser
 * interpretation of a different milestone. A looser stage that would match more than one milestone
 * is rejected rather than guessed at, which keeps the caller from silently picking the wrong one of
 * two similarly named milestones.
 */
const resolve = (candidate: string, titles: string[]): string | null => {
  const exact = titles.find(title => title === candidate)
  if (exact) return exact

  const caseInsensitive = titles.filter(title => title.toLowerCase() === candidate.toLowerCase())
  if (caseInsensitive.length === 1) return caseInsensitive[0]

  const key = normalize(candidate)
  // An empty key carries no information (e.g. the model echoed only the emoji), so it must not match.
  if (key === '') return null
  const normalized = titles.filter(title => normalize(title) === key)
  return normalized.length === 1 ? normalized[0] : null
}

/**
 * Resolves a milestone title produced by the model to the exact title of a currently open milestone,
 * or null when it matches none.
 *
 * Returning null is not an error: it is how a hallucinated, renamed, or closed milestone is
 * rejected, which is what stops the workflow from ever assigning a milestone that does not exist.
 *
 * Two candidates are tried, in order. The whole string first, so a real title always wins outright.
 * Then, only if that failed, the part before a dash separator — because a model shown a milestone
 * alongside its description will sometimes copy back `<title> — <description>` as the title. Taking
 * the prefix is deliberately narrow rather than a general "starts with a title" rule, which would
 * let an invented milestone whose name merely begins with a real one through the same gap.
 */
const matchMilestone = (raw: string | null | undefined, titles: string[]): string | null => {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const beforeSeparator = trimmed.split(/\s+[—–-]\s+/)[0]
  return resolve(trimmed, titles) ?? (beforeSeparator !== trimmed ? resolve(beforeSeparator, titles) : null)
}

export default matchMilestone
