import { ESTIMATE_CATEGORIES, type EstimateCategory } from '../everhour/estimates.ts'
import { type EstimateResponse, parseEstimate } from './validateEstimate.ts'

/** Aggregated result of a self-consistency vote across multiple model samples. */
export interface VoteResult {
  /** The modal (plurality) estimate category across all valid votes. */
  estimate: EstimateCategory
  /** Fraction of valid votes that agreed with the modal estimate (modeCount / validCount), 0–1. */
  agreement: number
  /** Number of model samples that produced a valid, schema-conforming estimate. */
  validVotes: number
  /** Total number of model samples considered (including malformed ones). */
  totalVotes: number
  /** Self-reported confidence carried from a modal-winning vote. */
  confidence: EstimateResponse['confidence']
  /** Rationale carried from a modal-winning vote, for the audit trail. */
  rationale: string
  /** Second-choice category from a modal-winning vote, if the model provided one. */
  secondChoice?: EstimateCategory
}

/** Ordinal index of a category on the XXS<XS<S<M<L<XL<XXL scale. */
const categoryIndex = (category: EstimateCategory): number => ESTIMATE_CATEGORIES.indexOf(category)

/**
 * Tallies self-consistency votes from raw model outputs into a single estimate plus an agreement
 * score. Each raw output is parsed independently; malformed or non-conforming outputs are discarded
 * (they do not count toward agreement). The modal category wins; ties are broken toward the larger
 * (more conservative) category, which biases against underestimation. The carried confidence,
 * rationale, and secondChoice come from a vote that landed on the winning category.
 *
 * Throws only when zero votes are valid, preserving the fail-loud behavior of the prior
 * single-response validation path.
 */
const tallyVotes = (rawOutputs: string[]): VoteResult => {
  const parsed = rawOutputs.map(parseEstimate).filter((r): r is EstimateResponse => r !== null)

  if (parsed.length === 0) {
    throw new Error(`Failed to validate any estimate vote. Raw outputs: ${JSON.stringify(rawOutputs)}`)
  }

  // Count votes per category.
  const counts = new Map<EstimateCategory, number>()
  for (const { estimate } of parsed) {
    counts.set(estimate, (counts.get(estimate) ?? 0) + 1)
  }

  // Pick the modal category, breaking ties toward the larger (more conservative) category.
  const [estimate, modeCount] = [...counts.entries()].reduce((best, candidate) => {
    const [bestCat, bestCount] = best
    const [candCat, candCount] = candidate
    if (candCount > bestCount) return candidate
    if (candCount === bestCount && categoryIndex(candCat) > categoryIndex(bestCat)) return candidate
    return best
  })

  // Carry the audit fields from a vote that agreed with the winning category.
  const winning = parsed.find(r => r.estimate === estimate)!

  return {
    estimate,
    agreement: modeCount / parsed.length,
    validVotes: parsed.length,
    totalVotes: rawOutputs.length,
    confidence: winning.confidence,
    rationale: winning.rationale,
    secondChoice: winning.secondChoice,
  }
}

export default tallyVotes
