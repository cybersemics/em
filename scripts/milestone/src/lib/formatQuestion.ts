import type { Selection } from './selectMilestone.ts'

/** The maintainer asked to categorize an issue the workflow could not confidently place. */
const MAINTAINER = '@raineorshine'

/**
 * Formats the comment posted when no milestone is assigned.
 *
 * This is the workflow's only comment — a successful assignment says nothing — so it has to carry
 * everything a human needs to answer in one read: what was uncertain, what the model nearly chose,
 * and why. Naming the closest guess turns the question from "categorize this" into "confirm or
 * correct this", which is a much cheaper thing to be asked.
 */
const formatQuestion = (selection: Selection): string => {
  const lines = [
    `${MAINTAINER} Which milestone should this issue go in?`,
    '',
    `No milestone was assigned: ${selection.reasons.join('; ')}.`,
  ]

  if (selection.milestone) {
    lines.push('')
    const votes = `${selection.validVotes} vote${selection.validVotes === 1 ? '' : 's'}`
    lines.push(
      `Closest guess: **${selection.milestone}** — ${Math.round(selection.agreement * 100)}% of ${votes} agreed, confidence ${selection.confidence}.`,
    )
    // A second choice identical to the guess tells the reader nothing and reads like a mistake.
    if (selection.secondChoice && selection.secondChoice !== selection.milestone) {
      lines.push(`Second choice: ${selection.secondChoice}.`)
    }
  }

  if (selection.rationale) {
    lines.push('')
    lines.push(`> ${selection.rationale}`)
  }

  return lines.join('\n')
}

export default formatQuestion
