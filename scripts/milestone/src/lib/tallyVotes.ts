import matchMilestone from './matchMilestone.ts'
import parseSelection, { type Confidence, type SelectionResponse } from './parseSelection.ts'

/** Aggregated result of a self-consistency vote across several model samples. */
export interface VoteResult {
  /** Title of the winning open milestone, or null when the votes concluded that none fits. */
  milestone: string | null
  /** Fraction of valid votes that agreed with the winner (0–1). */
  agreement: number
  /** Number of samples that produced a valid, actionable vote. */
  validVotes: number
  /** Total number of samples considered, including discarded ones. */
  totalVotes: number
  /** Whether two or more candidates tied for the most votes. A tie never assigns. */
  tied: boolean
  /** Self-reported confidence carried from a winning vote. */
  confidence: Confidence
  /** Rationale carried from a winning vote, for the audit trail and the question posted to a human. */
  rationale: string
  /** Second-choice milestone from a winning vote, resolved against the open milestones. */
  secondChoice: string | null
}

/**
 * Tallies self-consistency votes into a single milestone selection plus an agreement score.
 *
 * Each raw output is parsed independently. Two kinds of vote are dropped rather than counted: one
 * that does not parse, and one naming a milestone that is not currently open. The second case
 * matters — a hallucinated or closed milestone is invalid output, not evidence that nothing fits,
 * so folding it into the "no milestone" tally would let a confused model talk the workflow into
 * asking a human for the wrong reason. An explicit null milestone is the opposite: a real answer,
 * and it competes in the tally like any other candidate.
 *
 * Returns null when no vote survives, which is the caller's signal to retry inference.
 */
const tallyVotes = (rawOutputs: string[], milestoneTitles: string[]): VoteResult | null => {
  const votes = rawOutputs
    .map(parseSelection)
    .filter((response): response is SelectionResponse => response !== null)
    .map(response => ({
      response,
      milestone: response.milestone === null ? null : matchMilestone(response.milestone, milestoneTitles),
    }))
    .filter(vote => vote.response.milestone === null || vote.milestone !== null)

  if (votes.length === 0) return null

  const counts = new Map<string | null, number>()
  for (const vote of votes) {
    counts.set(vote.milestone, (counts.get(vote.milestone) ?? 0) + 1)
  }

  const maxCount = Math.max(...counts.values())
  const leaders = [...counts.entries()].filter(([, count]) => count === maxCount).map(([milestone]) => milestone)
  // Break a tie by vote order so the winner is deterministic, and so a tied run can still name its
  // closest guess when it asks a human. The gate is what refuses to assign on a tie.
  const winning = votes.find(vote => leaders.includes(vote.milestone))!

  return {
    milestone: winning.milestone,
    agreement: maxCount / votes.length,
    validVotes: votes.length,
    totalVotes: rawOutputs.length,
    tied: leaders.length > 1,
    confidence: winning.response.confidence,
    rationale: winning.response.rationale,
    secondChoice: matchMilestone(winning.response.secondChoice, milestoneTitles),
  }
}

export default tallyVotes
