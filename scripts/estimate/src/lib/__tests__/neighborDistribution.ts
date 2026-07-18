import { describe, expect, it } from 'vitest'
import type { EstimateSample } from '../loadSamples.ts'
import { formatNeighborDistribution, neighborDispersion, neighborDistribution } from '../neighborDistribution.ts'

/** Builds a sample carrying only the expected category (the field the distribution reads). */
const sample = (expected: string): EstimateSample => ({
  input: { title: '', body: '', labels: [] },
  expected,
})

describe('neighborDistribution', () => {
  it('counts categories ordered most-to-least frequent', () => {
    const result = neighborDistribution(['M', 'S', 'M', 'M', 'S', 'L'].map(sample))
    expect(result).toEqual([
      { category: 'M', count: 3 },
      { category: 'S', count: 2 },
      { category: 'L', count: 1 },
    ])
  })

  it('breaks count ties toward the larger bucket', () => {
    const result = neighborDistribution(['S', 'L'].map(sample))
    expect(result).toEqual([
      { category: 'L', count: 1 },
      { category: 'S', count: 1 },
    ])
  })

  it('ignores unrecognized categories', () => {
    const result = neighborDistribution([sample('M'), sample('BOGUS'), sample('M')])
    expect(result).toEqual([{ category: 'M', count: 2 }])
  })

  it('returns an empty array for no neighbors', () => {
    expect(neighborDistribution([])).toEqual([])
  })
})

describe('formatNeighborDistribution', () => {
  it('renders a compact line', () => {
    const dist = neighborDistribution(['M', 'M', 'S'].map(sample))
    expect(formatNeighborDistribution(dist)).toBe('M×2, S×1')
  })

  it('returns an empty string for an empty distribution', () => {
    expect(formatNeighborDistribution([])).toBe('')
  })
})

describe('neighborDispersion', () => {
  it('is 0 when all neighbors share one bucket', () => {
    expect(neighborDispersion(['M', 'M', 'M'].map(sample))).toBe(0)
  })

  it('is 0 for fewer than two neighbors', () => {
    expect(neighborDispersion([])).toBe(0)
    expect(neighborDispersion([sample('M')])).toBe(0)
  })

  it('is 1 when neighbors split evenly across the extremes', () => {
    expect(neighborDispersion(['XXS', 'XXL'].map(sample))).toBe(1)
  })

  it('is small for tightly clustered adjacent buckets', () => {
    const dispersion = neighborDispersion(['S', 'S', 'M', 'M'].map(sample))
    expect(dispersion).toBeGreaterThan(0)
    expect(dispersion).toBeLessThan(0.2)
  })

  it('ignores unrecognized categories', () => {
    expect(neighborDispersion([sample('M'), sample('BOGUS'), sample('M')])).toBe(0)
  })
})
