import { type EstimateResponse } from './validateEstimate.ts'

/** Self-reported confidence, ordered from least to most certain, for threshold comparisons. */
const CONFIDENCE_ORDER: EstimateResponse['confidence'][] = ['low', 'medium', 'high']

/** Tunable thresholds for the confidence gate. */
export interface GateThresholds {
  /** Trip when vote agreement (0–1) is strictly below this. */
  minAgreement: number
  /** Trip when neighbor dispersion (0–1) is strictly above this. */
  maxDispersion: number
  /** Trip when self-reported confidence is strictly below this level. */
  minConfidence: EstimateResponse['confidence']
}

/**
 * Default gate thresholds. An estimate is flagged for human review when the votes disagree
 * (agreement < 0.5), the retrieved neighbors are scattered across the scale (dispersion > 0.5), or
 * the model reports low self-confidence. These are deliberately lenient so the gate flags only
 * genuinely uncertain estimates; tune via the ESTIMATE_GATE_* env vars.
 */
export const DEFAULT_GATE_THRESHOLDS: GateThresholds = {
  minAgreement: 0.5,
  maxDispersion: 0.5,
  minConfidence: 'medium',
}

/**
 * Resolves gate thresholds from environment overrides, falling back to DEFAULT_GATE_THRESHOLDS for
 * any var that is unset or unparseable. Kept separate from evaluateGate so the decision logic stays
 * pure and unit-testable with explicit thresholds.
 */
export const resolveGateThresholds = (env: NodeJS.ProcessEnv = process.env): GateThresholds => {
  const num = (value: string | undefined, fallback: number): number => {
    const parsed = value != null ? Number(value) : NaN
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const confidence = env.ESTIMATE_GATE_MIN_CONFIDENCE as EstimateResponse['confidence'] | undefined
  return {
    minAgreement: num(env.ESTIMATE_GATE_MIN_AGREEMENT, DEFAULT_GATE_THRESHOLDS.minAgreement),
    maxDispersion: num(env.ESTIMATE_GATE_MAX_DISPERSION, DEFAULT_GATE_THRESHOLDS.maxDispersion),
    minConfidence: CONFIDENCE_ORDER.includes(confidence as EstimateResponse['confidence'])
      ? (confidence as EstimateResponse['confidence'])
      : DEFAULT_GATE_THRESHOLDS.minConfidence,
  }
}

/** The uncertainty signals fed into the gate. */
export interface GateSignals {
  /** Fraction of votes agreeing with the chosen category (0–1), from tallyVotes. */
  agreement: number
  /**
   * Neighbor category dispersion (0–1), from neighborDispersion. Undefined when retrieval was
   * unavailable (no embeddings); the dispersion signal is then skipped rather than assumed safe.
   */
  dispersion?: number
  /** Model self-reported confidence, from the winning vote. */
  confidence: EstimateResponse['confidence']
}

/** The gate's decision plus the human-readable reasons it tripped, for the audit trail. */
export interface GateDecision {
  /** Whether the estimate should be flagged for human review. */
  needsReview: boolean
  /** One entry per tripped signal, e.g. `low vote agreement (40% < 50%)`. Empty when not tripped. */
  reasons: string[]
}

/**
 * Pure confidence-gate decision. Combines the three independent uncertainty signals — vote
 * agreement, neighbor dispersion, and model self-confidence — and trips (needsReview) when ANY of
 * them crosses its threshold. The dispersion signal is skipped when undefined so a run without
 * retrieval degrades to an agreement + confidence gate rather than erroring. Side effects (labeling
 * the issue, audit comment) are the caller's responsibility; this function only decides.
 */
export const evaluateGate = (
  signals: GateSignals,
  thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS,
): GateDecision => {
  const reasons: string[] = []

  if (signals.agreement < thresholds.minAgreement) {
    reasons.push(
      `low vote agreement (${Math.round(signals.agreement * 100)}% < ${Math.round(thresholds.minAgreement * 100)}%)`,
    )
  }

  if (signals.dispersion != null && signals.dispersion > thresholds.maxDispersion) {
    reasons.push(
      `dispersed neighbors (dispersion ${signals.dispersion.toFixed(2)} > ${thresholds.maxDispersion.toFixed(2)})`,
    )
  }

  if (CONFIDENCE_ORDER.indexOf(signals.confidence) < CONFIDENCE_ORDER.indexOf(thresholds.minConfidence)) {
    reasons.push(`low self-confidence (${signals.confidence} < ${thresholds.minConfidence})`)
  }

  return { needsReview: reasons.length > 0, reasons }
}
