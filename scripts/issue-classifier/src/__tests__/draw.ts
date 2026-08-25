/**
 * Tests for the blind sampling frame.
 *
 * The frame decides which issues a measurement is allowed to see, so every exclusion here is load
 * bearing: one that silently stops working produces a corpus that looks fine and measures the wrong
 * thing. The date cutoff in particular guards against the classifier being graded on milestones it
 * assigned itself, which would read as accuracy climbing rather than as a bug.
 */
import { describe, expect, it } from 'vitest'
import { buildFrame, draw, rank } from '../draw.ts'
import type { Issue } from '../lib/github.ts'

/** One issue, defaulting everything the test in question does not care about. */
const issue = (number: number, over: Partial<Issue> = {}): Issue => ({
  number,
  title: `issue ${number}`,
  body: 'a reproducible body',
  labels: ['bug'],
  milestone: '📐 Layout',
  isPullRequest: false,
  createdAt: '2024-01-01T00:00:00Z',
  ...over,
})

const OPEN = new Set(['📐 Layout', '🧤 Drag & Drop'])

describe('buildFrame', () => {
  it('keeps an issue a human filed and milestoned into an open milestone', () => {
    expect(buildFrame([issue(1)], OPEN, new Set()).map(i => i.number)).toEqual([1])
  })

  it('excludes an issue with no milestone, which has no correct answer to grade against', () => {
    expect(buildFrame([issue(1, { milestone: null })], OPEN, new Set())).toEqual([])
  })

  it('excludes a milestone that is closed, which the classifier is never offered', () => {
    expect(buildFrame([issue(1, { milestone: '🥞 Flat Render' })], OPEN, new Set())).toEqual([])
  })

  it('excludes an empty body, which measures how well a title alone classifies', () => {
    expect(buildFrame([issue(1, { body: '   ' })], OPEN, new Set())).toEqual([])
  })

  it('excludes an issue any sample file already holds', () => {
    expect(buildFrame([issue(1), issue(2)], OPEN, new Set([1])).map(i => i.number)).toEqual([2])
  })

  describe('the creation-date cutoff', () => {
    it('excludes an issue created on or after the date the classifier began assigning', () => {
      const issues = [issue(1, { createdAt: '2026-01-01T00:00:00Z' }), issue(2, { createdAt: '2026-09-01T00:00:00Z' })]
      expect(buildFrame(issues, OPEN, new Set(), '2026-06-01').map(i => i.number)).toEqual([1])
    })

    it('excludes an issue created exactly at the cutoff, since that day is already ambiguous', () => {
      const issues = [issue(1, { createdAt: '2026-06-01T00:00:00Z' })]
      expect(buildFrame(issues, OPEN, new Set(), '2026-06-01')).toEqual([])
    })

    it('excludes an issue with no recorded creation date rather than assuming it predates the cutoff', () => {
      expect(buildFrame([issue(1, { createdAt: undefined })], OPEN, new Set(), '2026-06-01')).toEqual([])
    })

    it('keeps an undated issue when no cutoff applies, so the guard costs nothing before deployment', () => {
      expect(buildFrame([issue(1, { createdAt: undefined })], OPEN, new Set()).map(i => i.number)).toEqual([1])
    })
  })
})

describe('draw', () => {
  const frame = Array.from({ length: 40 }, (_, i) => issue(i + 1))

  it('is reproducible from its seed', () => {
    expect(draw(frame, 'a-seed', 10).map(i => i.number)).toEqual(draw(frame, 'a-seed', 10).map(i => i.number))
  })

  it('draws a different sample under a different seed', () => {
    expect(draw(frame, 'one', 10).map(i => i.number)).not.toEqual(draw(frame, 'two', 10).map(i => i.number))
  })

  it('moves only the removed issue when the frame changes, rather than reshuffling the draw', () => {
    // This is what the seeded hash buys over a shuffle: a draw stays comparable as the repository grows.
    const first = draw(frame, 'stable', 10).map(i => i.number)
    const without = draw(
      frame.filter(i => i.number !== first[0]),
      'stable',
      10,
    ).map(i => i.number)
    expect(without.slice(0, 9)).toEqual(first.slice(1))
  })

  it('takes the whole frame when asked for more than it holds', () => {
    expect(draw(frame, 'seed', 100).length).toBe(40)
  })
})

describe('rank', () => {
  it('is stable for the same seed and issue', () => {
    expect(rank('seed', 42)).toBe(rank('seed', 42))
  })

  it('stays inside the exact integer range, so distinct hashes stay distinct', () => {
    for (const n of [1, 500, 99999]) expect(rank('seed', n)).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER)
  })
})
