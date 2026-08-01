import { describe, expect, it } from 'vitest'
import tallyVotes from '../tallyVotes.ts'

/** Builds a raw JSON vote string. */
const vote = (estimate: string, extra: Record<string, unknown> = {}): string => JSON.stringify({ estimate, ...extra })

describe('tallyVotes', () => {
  it('returns the unanimous estimate with full agreement', () => {
    const result = tallyVotes([vote('S'), vote('S'), vote('S')])
    expect(result.estimate).toBe('S')
    expect(result.agreement).toBe(1)
    expect(result.validVotes).toBe(3)
    expect(result.totalVotes).toBe(3)
  })

  it('returns the modal estimate and fractional agreement', () => {
    const result = tallyVotes([vote('S'), vote('M'), vote('M'), vote('L'), vote('S')])
    // S×2, M×2, L×1 → tie between S and M broken toward the larger bucket (M)
    expect(result.estimate).toBe('M')
    expect(result.agreement).toBeCloseTo(2 / 5)
  })

  it('picks a clear plurality winner', () => {
    const result = tallyVotes([vote('S'), vote('S'), vote('S'), vote('M'), vote('L')])
    expect(result.estimate).toBe('S')
    expect(result.agreement).toBeCloseTo(3 / 5)
  })

  it('breaks ties toward the larger (more conservative) bucket', () => {
    const result = tallyVotes([vote('XS'), vote('XL')])
    expect(result.estimate).toBe('XL')
    expect(result.agreement).toBe(0.5)
  })

  it('discards malformed votes and counts agreement over valid votes only', () => {
    const result = tallyVotes(['not json', vote('M'), '{"bad": true}', vote('M')])
    expect(result.estimate).toBe('M')
    expect(result.validVotes).toBe(2)
    expect(result.totalVotes).toBe(4)
    expect(result.agreement).toBe(1)
  })

  it('carries confidence, rationale, and secondChoice from a winning vote', () => {
    const result = tallyVotes([
      vote('L', { confidence: 'high', rationale: 'cross-cutting', secondChoice: 'M' }),
      vote('S'),
    ])
    expect(result.estimate).toBe('L')
    expect(result.confidence).toBe('high')
    expect(result.rationale).toBe('cross-cutting')
    expect(result.secondChoice).toBe('M')
  })

  it('throws when no votes are valid', () => {
    expect(() => tallyVotes(['nope', '{}', 'also bad'])).toThrow('Failed to validate any estimate vote')
  })
})
