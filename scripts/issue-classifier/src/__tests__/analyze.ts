/**
 * Tests for the paired comparison statistics.
 *
 * These are worth more than their size suggests. A wrong p-value or a wrong flip count does not
 * announce itself — it prints a plausible number that decides which model gets deployed — so each
 * one is checked against a value computed by hand rather than against the implementation's own
 * output.
 */
import { describe, expect, it } from 'vitest'
import { bootstrapDifference, consolidate, costOf, mcnemarExactP, report, wilson } from '../analyze.ts'
import type { CompareRow } from '../compare.ts'

/** Builds one graded row, defaulting everything the test in question does not care about. */
const row = (over: Partial<CompareRow> & Pick<CompareRow, 'model' | 'issue' | 'guess'>): CompareRow => ({
  run: 1,
  expected: 'A',
  correct: over.guess === (over.expected ?? 'A'),
  agreement: 1,
  validVotes: 5,
  tied: false,
  confidence: 'high',
  usage: { prompt: 1000, cachedPrompt: 0, completion: 100, reasoning: 0 },
  latencyMs: 1000,
  ...over,
})

describe('mcnemarExactP', () => {
  it('is 1 when no pair is discordant, because nothing distinguishes the models', () => {
    expect(mcnemarExactP(0, 0)).toBe(1)
  })

  it('matches the exact binomial tail computed by hand', () => {
    // n = 10, two-sided = 2 × (C(10,0) + C(10,1)) / 2^10 = 2 × 11 / 1024.
    expect(mcnemarExactP(1, 9)).toBeCloseTo((2 * 11) / 1024, 10)
    // n = 5, one arm clean: two-sided = 2 × 1 / 32.
    expect(mcnemarExactP(0, 5)).toBeCloseTo(2 / 32, 10)
  })

  it('clamps an even split at 1 rather than reporting a probability above it', () => {
    expect(mcnemarExactP(5, 5)).toBe(1)
  })

  it('is symmetric, since the test says nothing about which direction won', () => {
    expect(mcnemarExactP(2, 11)).toBeCloseTo(mcnemarExactP(11, 2), 12)
  })

  it('does not call a three-versus-nothing split significant, which is the count this harness will meet', () => {
    // The smallest clean sweep that reaches p < 0.05 is 5–0; 3–0 gives 0.25 and 4–0 gives 0.125.
    expect(mcnemarExactP(0, 3)).toBeCloseTo(0.25, 10)
    expect(mcnemarExactP(0, 4)).toBeCloseTo(0.125, 10)
  })
})

describe('wilson', () => {
  it('brackets the point estimate', () => {
    const [low, high] = wilson(37, 50)
    expect(low).toBeLessThan(0.74)
    expect(high).toBeGreaterThan(0.74)
  })

  it('stays inside [0, 1] at the boundary, where a normal approximation would not', () => {
    const [low, high] = wilson(50, 50)
    expect(low).toBeGreaterThan(0)
    expect(high).toBeLessThanOrEqual(1)
  })

  it('narrows as the sample grows', () => {
    const [smallLow, smallHigh] = wilson(37, 50)
    const [largeLow, largeHigh] = wilson(370, 500)
    expect(largeHigh - largeLow).toBeLessThan(smallHigh - smallLow)
  })
})

describe('consolidate', () => {
  it('takes the modal answer across runs, not the first run', () => {
    const verdict = consolidate([
      row({ model: 'm', issue: 1, guess: 'B', run: 1 }),
      row({ model: 'm', issue: 1, guess: 'A', run: 2 }),
      row({ model: 'm', issue: 1, guess: 'A', run: 3 }),
    ])
    expect(verdict).toMatchObject({ guess: 'A', correct: true, correctRuns: 2, runs: 3, stable: false })
  })

  it('reports a model that never changed its answer as stable', () => {
    const verdict = consolidate([
      row({ model: 'm', issue: 1, guess: 'B', run: 1 }),
      row({ model: 'm', issue: 1, guess: 'B', run: 2 }),
    ])
    expect(verdict).toMatchObject({ guess: 'B', correct: false, correctRuns: 0, stable: true })
  })
})

describe('bootstrapDifference', () => {
  it('excludes zero when every discordant pair falls the same way', () => {
    const pairs = [
      ...Array.from({ length: 20 }, () => ({ a: false, b: true })),
      ...Array.from({ length: 80 }, () => ({ a: true, b: true })),
    ]
    const [low, high] = bootstrapDifference(pairs, 2000)
    expect(low).toBeGreaterThan(0)
    expect(high).toBeGreaterThan(low)
  })

  it('straddles zero when the models trade errors evenly', () => {
    const pairs = [
      ...Array.from({ length: 10 }, () => ({ a: false, b: true })),
      ...Array.from({ length: 10 }, () => ({ a: true, b: false })),
      ...Array.from({ length: 80 }, () => ({ a: true, b: true })),
    ]
    const [low, high] = bootstrapDifference(pairs, 2000)
    expect(low).toBeLessThan(0)
    expect(high).toBeGreaterThan(0)
  })

  it('is reproducible from its seed', () => {
    const pairs = Array.from({ length: 40 }, (_, i) => ({ a: i % 3 !== 0, b: i % 4 !== 0 }))
    expect(bootstrapDifference(pairs, 500, 7)).toEqual(bootstrapDifference(pairs, 500, 7))
  })
})

describe('costOf', () => {
  it('prices cached prompt tokens at the cached rate, not the full one', () => {
    const uncached = costOf([
      row({
        model: 'gpt-5.6-terra',
        issue: 1,
        guess: 'A',
        usage: { prompt: 1_000_000, cachedPrompt: 0, completion: 0, reasoning: 0 },
      }),
    ])
    const cached = costOf([
      row({
        model: 'gpt-5.6-terra',
        issue: 1,
        guess: 'A',
        usage: { prompt: 1_000_000, cachedPrompt: 1_000_000, completion: 0, reasoning: 0 },
      }),
    ])
    expect(uncached).toBeCloseTo(2.0, 6)
    expect(cached).toBeCloseTo(0.2, 6)
  })

  it('refuses a model it has no price for, rather than reporting it as free', () => {
    expect(() => costOf([row({ model: 'gpt-5.6-unknown', issue: 1, guess: 'A' })])).toThrow(/No price/)
  })
})

describe('report', () => {
  // Two issues fixed, one broken, one shared error — small enough that every count in the report can
  // be checked by reading this fixture.
  const rows: CompareRow[] = [
    row({ model: 'gpt-5.6-terra', issue: 1, guess: 'X', expected: 'A' }),
    row({ model: 'gpt-5.6-sol', issue: 1, guess: 'A', expected: 'A' }),
    row({ model: 'gpt-5.6-terra', issue: 2, guess: 'X', expected: 'A' }),
    row({ model: 'gpt-5.6-sol', issue: 2, guess: 'A', expected: 'A' }),
    row({ model: 'gpt-5.6-terra', issue: 3, guess: 'A', expected: 'A' }),
    row({ model: 'gpt-5.6-sol', issue: 3, guess: 'Y', expected: 'A' }),
    row({ model: 'gpt-5.6-terra', issue: 4, guess: 'Z', expected: 'A' }),
    row({ model: 'gpt-5.6-sol', issue: 4, guess: 'Z', expected: 'A' }),
  ]

  it('counts the flips in both directions', () => {
    const text = report(rows, 'gpt-5.6-terra')
    expect(text).toMatch(/gpt-5\.6-sol fixes gpt-5\.6-terra\s+: 2/)
    expect(text).toMatch(/gpt-5\.6-sol breaks gpt-5\.6-terra\s+: 1/)
  })

  it('names the issues behind each flip, so a regression can be looked at rather than only counted', () => {
    const text = report(rows, 'gpt-5.6-terra')
    expect(text).toContain('#1  expected A; gpt-5.6-terra said X')
    expect(text).toContain('#3  expected A; gpt-5.6-sol said Y')
  })

  it('separates a shared error on the same answer from a shared error on different ones', () => {
    const text = report(rows, 'gpt-5.6-terra')
    expect(text).toContain('same wrong answer      : 1')
    expect(text).toContain('different wrong answers: 0')
  })

  it('refuses a file that does not hold exactly two models to pair', () => {
    expect(() => report([...rows, row({ model: 'gpt-5.6-luna', issue: 1, guess: 'A' })], 'gpt-5.6-terra')).toThrow(
      /exactly two models/,
    )
  })
})
