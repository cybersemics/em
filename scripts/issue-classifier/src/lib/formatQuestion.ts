import type { VoteResult } from './tallyVotes.ts'

/** The maintainer asked to classify an issue that matched no existing milestone. */
const MAINTAINER = '@raineorshine'

/**
 * Formats the comment posted when the votes named no milestone at all.
 *
 * This is the workflow's only comment. Every issue the votes can place is assigned, and a pure
 * refactor that fits no domain is labeled rather than asked about, so reaching here means the
 * taxonomy has no home for an issue that is not simply restructuring work — which is worth a
 * human's attention in a way that "the model was only fairly sure" never was. The model's own
 * reasoning is quoted because it usually says what the issue is about, which is the part that
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
