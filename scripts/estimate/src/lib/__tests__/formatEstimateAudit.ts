import { describe, expect, it } from 'vitest'
import type { Estimate } from '../estimateIssue.ts'
import formatEstimateAudit from '../formatEstimateAudit.ts'

/** Builds an Estimate with sensible defaults, overridable per test. */
const estimate = (overrides: Partial<Estimate> = {}): Estimate => ({
  category: 'M',
  hours: 8,
  seconds: 28800,
  agreement: 1,
  confidence: 'high',
  rationale: '',
  neighborDistribution: [],
  needsReview: false,
  gateReasons: [],
  ...overrides,
})

describe('formatEstimateAudit', () => {
  it('returns no lines when there is no distribution and no review flag', () => {
    expect(formatEstimateAudit(estimate())).toEqual([])
  })

  it('surfaces the neighbor distribution when present', () => {
    const lines = formatEstimateAudit(
      estimate({
        neighborDistribution: [
          { category: 'M', count: 4 },
          { category: 'S', count: 3 },
        ],
      }),
    )
    expect(lines).toEqual(['Similar past issues: M×4, S×3'])
  })

  it('surfaces the review flag and reasons when the gate tripped', () => {
    const lines = formatEstimateAudit(estimate({ needsReview: true, gateReasons: ['low vote agreement (40% < 50%)'] }))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('estimate-needs-review')
    expect(lines[0]).toContain('low vote agreement')
  })

  it('surfaces both the distribution and the review flag together', () => {
    const lines = formatEstimateAudit(
      estimate({
        neighborDistribution: [{ category: 'L', count: 2 }],
        needsReview: true,
        gateReasons: ['dispersed neighbors (dispersion 0.90 > 0.50)'],
      }),
    )
    expect(lines).toHaveLength(2)
  })
})
