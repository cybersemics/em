import { describe, expect, it } from 'vitest'
import gate, { DEFAULT_GATE_THRESHOLDS, resolveGateThresholds } from '../gate.ts'
import type { VoteResult } from '../tallyVotes.ts'

/** A vote that clears every gate threshold, for tests to vary one property at a time. */
const passingVote: VoteResult = {
  milestone: '🧤 Drag & Drop',
  agreement: 1,
  validVotes: 5,
  totalVotes: 5,
  tied: false,
  confidence: 'high',
  rationale: 'Drop indicator is misplaced.',
  secondChoice: null,
}

describe('gate', () => {
  it('assigns a unanimous, high-confidence selection', () => {
    expect(gate(passingVote)).toEqual({ assign: true, reasons: [] })
  })

  it('withholds when no milestone fits', () => {
    const result = gate({ ...passingVote, milestone: null })
    expect(result.assign).toBe(false)
    expect(result.reasons).toContain('no existing milestone fits this issue')
  })

  it('withholds when the votes tied', () => {
    const result = gate({ ...passingVote, tied: true })
    expect(result.assign).toBe(false)
    expect(result.reasons).toContain('the votes were split evenly between milestones')
  })

  it('withholds below the confidence floor', () => {
    const result = gate({ ...passingVote, confidence: 'medium' })
    expect(result.assign).toBe(false)
    expect(result.reasons).toContain('confidence was medium, below the required high')
  })

  it('withholds below the agreement floor', () => {
    const result = gate({ ...passingVote, agreement: 0.4 })
    expect(result.assign).toBe(false)
    expect(result.reasons).toContain('only 40% of votes agreed, below the required 60%')
  })

  it('reports every failing signal, not just the first', () => {
    expect(gate({ ...passingVote, milestone: null, confidence: 'low', agreement: 0.2 }).reasons).toHaveLength(3)
  })

  it('honors a relaxed confidence threshold', () => {
    expect(gate({ ...passingVote, confidence: 'medium' }, { minConfidence: 'medium', minAgreement: 0.6 }).assign).toBe(
      true,
    )
  })
})

describe('resolveGateThresholds', () => {
  it('falls back to the defaults when nothing is set', () => {
    expect(resolveGateThresholds({})).toEqual(DEFAULT_GATE_THRESHOLDS)
  })

  it('reads both thresholds from the environment', () => {
    expect(resolveGateThresholds({ MILESTONE_MIN_CONFIDENCE: 'medium', MILESTONE_MIN_AGREEMENT: '0.8' })).toEqual({
      minConfidence: 'medium',
      minAgreement: 0.8,
    })
  })

  it('throws on an unknown confidence level', () => {
    expect(() => resolveGateThresholds({ MILESTONE_MIN_CONFIDENCE: 'certain' })).toThrow(/MILESTONE_MIN_CONFIDENCE/)
  })

  it('throws on an agreement outside 0–1', () => {
    expect(() => resolveGateThresholds({ MILESTONE_MIN_AGREEMENT: '60' })).toThrow(/MILESTONE_MIN_AGREEMENT/)
    expect(() => resolveGateThresholds({ MILESTONE_MIN_AGREEMENT: 'most' })).toThrow(/MILESTONE_MIN_AGREEMENT/)
  })
})
