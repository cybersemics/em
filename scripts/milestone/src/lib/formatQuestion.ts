import type { VoteResult } from './tallyVotes.ts'

/** The maintainer asked to categorize an issue that matched no existing milestone. */
const MAINTAINER = '@raineorshine'

/**
 * Formats the comment posted when the votes named no milestone at all.
 *
 * This is the workflow's only comment, and it now has exactly one cause. Every issue the votes can
 * place is assigned, so reaching here means the taxonomy has no home for this issue — which is
 * worth a human's attention in a way that "the model was only fairly sure" never was. The model's
 * own reasoning is quoted because it usually says what the issue is about, which is the part that
 * decides whether a new milestone is warranted.
 */
const formatQuestion = (vote: VoteResult): string => {
  const lines = [`${MAINTAINER} Which milestone should this issue go in? It did not match any existing one.`]

  if (vote.rationale) {
    lines.push('')
    lines.push(`> ${vote.rationale}`)
  }

  return lines.join('\n')
}

export default formatQuestion
