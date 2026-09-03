import { describe, expect, it } from 'vitest'
import { type EvalRow, bucketDistance, computeMetrics } from '../evaluate.ts'

describe('bucketDistance', () => {
  it('is 0 for the same category', () => {
    expect(bucketDistance('M', 'M')).toBe(0)
  })

  it('is 1 for adjacent categories', () => {
    expect(bucketDistance('S', 'M')).toBe(1)
    expect(bucketDistance('M', 'S')).toBe(1)
  })

  it('measures ordinal distance across the scale', () => {
    expect(bucketDistance('XXS', 'XXL')).toBe(6)
    expect(bucketDistance('XS', 'L')).toBe(3)
  })
})

describe('computeMetrics', () => {
  const rows: EvalRow[] = [
    { expected: 'S', predicted: 'S', agreement: 1, confidence: 'high' }, // exact
    { expected: 'M', predicted: 'S', agreement: 0.6, confidence: 'medium' }, // ±1
    { expected: 'L', predicted: 'XXS', agreement: 0.4, confidence: 'low' }, // far miss
    { expected: 'M', predicted: 'M', agreement: 0.8, confidence: 'high' }, // exact
  ]

  it('computes exact-bucket accuracy', () => {
    const m = computeMetrics(rows)
    expect(m.exact.count).toBe(2)
    expect(m.exact.fraction).toBeCloseTo(0.5)
  })

  it('computes ±1-bucket accuracy (includes exact and adjacent)', () => {
    const m = computeMetrics(rows)
    // S→S (0), M→S (1), L→XXS (5), M→M (0) → 3 within 1
    expect(m.within1.count).toBe(3)
    expect(m.within1.fraction).toBeCloseTo(0.75)
  })

  it('builds a confusion matrix keyed expected → predicted', () => {
    const m = computeMetrics(rows)
    expect(m.confusion['M']).toEqual({ S: 1, M: 1 })
    expect(m.confusion['S']).toEqual({ S: 1 })
    expect(m.confusion['L']).toEqual({ XXS: 1 })
  })

  it('groups calibration by agreement tier and confidence level', () => {
    const m = computeMetrics(rows)
    expect(m.calibration['confidence:high']).toEqual({ total: 2, exact: 2 })
    expect(m.calibration['confidence:low']).toEqual({ total: 1, exact: 0 })
    expect(m.calibration['agreement≥0.8']).toEqual({ total: 2, exact: 2 })
    expect(m.calibration['agreement<0.5']).toEqual({ total: 1, exact: 0 })
  })

  it('handles an empty row set without dividing by zero', () => {
    const m = computeMetrics([])
    expect(m.total).toBe(0)
    expect(m.exact.fraction).toBe(0)
    expect(m.within1.fraction).toBe(0)
  })
})
