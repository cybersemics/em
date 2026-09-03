import matchMilestone from './matchMilestone.ts'
import parseSelection, {
  CONFIDENCE_LEVELS,
  type Confidence,
  type Label,
  type SelectionResponse,
} from './parseSelection.ts'

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
  /** Self-reported confidence, averaged over the votes that chose the winning milestone. */
  confidence: Confidence
  /** The kind of work the votes named, applied as a label, or null when they named none. */
  label: Label | null
  /** Number of valid votes that chose the winning label, for the audit trail. */
  labelVotes: number
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
 * Two things are tallied, not one, and both the same way: a modal vote with ties broken by vote
 * order. Which milestone owns the work is one question; what kind of work it is — the label — is a
 * second, independent one riding on the same samples. They are orthogonal on purpose, since a
 * refactor still belongs to the domain it restructures, so neither tally can move the other.
 *
 * The label tally is modal rather than a majority because there are eight candidates once `null` is
 * counted. A rule requiring more than half would leave most issues unlabeled on an ordinary 2-2-1
 * spread, and the argument the milestone tally already makes applies unchanged: a wrong label sits
 * visibly on the issue, one click from correct, while a missing one leaves it untyped in every
 * filtered view someone browses.
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
  // Break a tie by vote order so the winner is deterministic. A tie is reported but does not change
  // the outcome: its modal winner is assigned like any other, since a tie is a choice between two
  // plausible buckets rather than a failure to find one.
  const winning = votes.find(vote => leaders.includes(vote.milestone))!

  // Average the self-reported confidence over every vote that chose the winning milestone, rather
  // than reading it off one of them. Drawing several samples and then keeping a single sample's
  // confidence throws away most of what the extra samples were drawn for; the votes that named a
  // different milestone are excluded because their confidence is about a different answer.
  const agreeing = votes.filter(vote => vote.milestone === winning.milestone)
  const meanLevel =
    agreeing.reduce((total, vote) => total + CONFIDENCE_LEVELS.indexOf(vote.response.confidence), 0) / agreeing.length
  // Round halves down, so a split between two levels reports the more cautious of them.
  const confidence = CONFIDENCE_LEVELS[Math.ceil(meanLevel - 0.5)]

  // Tallied over every valid vote rather than only the agreeing ones, which is where this departs
  // from the confidence average above. Confidence is a claim about a particular milestone, so a vote
  // that named a different one is answering a different question; "this is a bug" is the same claim
  // whether the vote said 📐 Layout or 🎨 Formatting. Votes naming a milestone that is not open were
  // already dropped above, so a hallucinated milestone cannot smuggle its label in either.
  const labelCounts = new Map<Label | null, number>()
  for (const vote of votes) {
    labelCounts.set(vote.response.label, (labelCounts.get(vote.response.label) ?? 0) + 1)
  }
  const maxLabelCount = Math.max(...labelCounts.values())
  const labelLeaders = [...labelCounts.entries()].filter(([, count]) => count === maxLabelCount).map(([label]) => label)
  const label = votes.find(vote => labelLeaders.includes(vote.response.label))!.response.label
  const labelVotes = labelCounts.get(label)!

  return {
    milestone: winning.milestone,
    agreement: maxCount / votes.length,
    validVotes: votes.length,
    totalVotes: rawOutputs.length,
    tied: leaders.length > 1,
    confidence,
    label,
    labelVotes,
    rationale: winning.response.rationale,
    secondChoice: matchMilestone(winning.response.secondChoice, milestoneTitles),
  }
}

export default tallyVotes
