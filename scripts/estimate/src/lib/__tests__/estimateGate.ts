import { describe, expect, it } from 'vitest'
import { DEFAULT_GATE_THRESHOLDS, evaluateGate, resolveGateThresholds } from '../estimateGate.ts'

describe('evaluateGate', () => {
  it('does not trip when all signals are within thresholds', () => {
    const decision = evaluateGate({ agreement: 0.8, dispersion: 0.2, confidence: 'high' })
    expect(decision.needsReview).toBe(false)
    expect(decision.reasons).toEqual([])
  })

  it('trips on low vote agreement', () => {
    const decision = evaluateGate({ agreement: 0.4, dispersion: 0.1, confidence: 'high' })
    expect(decision.needsReview).toBe(true)
    expect(decision.reasons[0]).toContain('low vote agreement')
  })

  it('trips on dispersed neighbors', () => {
    const decision = evaluateGate({ agreement: 1, dispersion: 0.9, confidence: 'high' })
    expect(decision.needsReview).toBe(true)
    expect(decision.reasons[0]).toContain('dispersed neighbors')
  })

  it('trips on low self-confidence', () => {
    const decision = evaluateGate({ agreement: 1, dispersion: 0, confidence: 'low' })
    expect(decision.needsReview).toBe(true)
    expect(decision.reasons[0]).toContain('low self-confidence')
  })

  it('accumulates multiple reasons when several signals trip', () => {
    const decision = evaluateGate({ agreement: 0.3, dispersion: 0.9, confidence: 'low' })
    expect(decision.needsReview).toBe(true)
    expect(decision.reasons).toHaveLength(3)
  })

  it('skips the dispersion signal when dispersion is undefined', () => {
    const decision = evaluateGate({ agreement: 1, confidence: 'high' })
    expect(decision.needsReview).toBe(false)
  })

  it('honors explicit thresholds over the defaults', () => {
    const strict = evaluateGate(
      { agreement: 0.9, dispersion: 0.1, confidence: 'medium' },
      { minAgreement: 0.95, maxDispersion: 0.5, minConfidence: 'high' },
    )
    expect(strict.needsReview).toBe(true)
    expect(strict.reasons).toHaveLength(2)
  })
})

describe('resolveGateThresholds', () => {
  it('returns defaults when no overrides are set', () => {
    expect(resolveGateThresholds({})).toEqual(DEFAULT_GATE_THRESHOLDS)
  })

  it('applies numeric and confidence overrides', () => {
    const thresholds = resolveGateThresholds({
      ESTIMATE_GATE_MIN_AGREEMENT: '0.7',
      ESTIMATE_GATE_MAX_DISPERSION: '0.3',
      ESTIMATE_GATE_MIN_CONFIDENCE: 'high',
    })
    expect(thresholds).toEqual({ minAgreement: 0.7, maxDispersion: 0.3, minConfidence: 'high' })
  })

  it('ignores unparseable numeric overrides and invalid confidence', () => {
    const thresholds = resolveGateThresholds({
      ESTIMATE_GATE_MIN_AGREEMENT: 'not-a-number',
      ESTIMATE_GATE_MIN_CONFIDENCE: 'bogus',
    })
    expect(thresholds).toEqual(DEFAULT_GATE_THRESHOLDS)
  })
})
