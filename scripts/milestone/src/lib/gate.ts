import { CONFIDENCE_LEVELS, type Confidence } from './parseSelection.ts'
import type { VoteResult } from './tallyVotes.ts'

/** Thresholds a vote must clear before its milestone is assigned automatically. */
export interface GateThresholds {
  /** Minimum self-reported confidence. */
  minConfidence: Confidence
  /** Minimum fraction of valid votes that must agree (0–1). */
  minAgreement: number
}

/**
 * Only a high-confidence selection is assigned automatically, per the workflow spec. The agreement
 * floor is an independent check on the same question: a model can report high confidence on a vote
 * its own siblings disagreed with, and that disagreement is the more honest signal.
 */
export const DEFAULT_GATE_THRESHOLDS: GateThresholds = {
  minConfidence: 'high',
  minAgreement: 0.6,
}

/** The gate's decision, plus the human-readable reasons an assignment was withheld. */
export interface GateResult {
  assign: boolean
  /** Why the milestone was not assigned. Empty when it was. Surfaced verbatim when asking a human. */
  reasons: string[]
}

/** Reads the gate thresholds from the environment, falling back to the defaults. Throws on an unusable value. */
export const resolveGateThresholds = (env: Record<string, string | undefined> = process.env): GateThresholds => {
  const rawConfidence = env.MILESTONE_MIN_CONFIDENCE
  if (rawConfidence != null && !CONFIDENCE_LEVELS.includes(rawConfidence as Confidence)) {
    throw new Error(`MILESTONE_MIN_CONFIDENCE must be one of ${CONFIDENCE_LEVELS.join(', ')}, got "${rawConfidence}"`)
  }

  const rawAgreement = env.MILESTONE_MIN_AGREEMENT
  const minAgreement = rawAgreement != null ? Number(rawAgreement) : DEFAULT_GATE_THRESHOLDS.minAgreement
  if (!Number.isFinite(minAgreement) || minAgreement < 0 || minAgreement > 1) {
    throw new Error(`MILESTONE_MIN_AGREEMENT must be a number between 0 and 1, got "${rawAgreement}"`)
  }

  return {
    minConfidence: (rawConfidence as Confidence) ?? DEFAULT_GATE_THRESHOLDS.minConfidence,
    minAgreement,
  }
}

/** Formats a 0–1 fraction as a whole-number percentage for the reasons shown to a human. */
const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`

/**
 * Decides whether a vote may be assigned automatically, and collects every reason it may not.
 *
 * Pure, and every failing signal is reported rather than just the first, so the question posted to a
 * human says what was actually uncertain instead of only the check that happened to run first.
 */
const gate = (vote: VoteResult, thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS): GateResult => {
  const reasons = [
    ...(vote.milestone === null ? ['no existing milestone fits this issue'] : []),
    ...(vote.tied ? ['the votes were split evenly between milestones'] : []),
    ...(CONFIDENCE_LEVELS.indexOf(vote.confidence) < CONFIDENCE_LEVELS.indexOf(thresholds.minConfidence)
      ? [`confidence was ${vote.confidence}, below the required ${thresholds.minConfidence}`]
      : []),
    ...(vote.agreement < thresholds.minAgreement
      ? [`only ${percent(vote.agreement)} of votes agreed, below the required ${percent(thresholds.minAgreement)}`]
      : []),
  ]

  return { assign: reasons.length === 0, reasons }
}

export default gate
