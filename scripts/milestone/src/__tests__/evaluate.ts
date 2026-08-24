import { describe, expect, it, vi } from 'vitest'
import {
  type EvalRow,
  auarc,
  auroc,
  computeMetrics,
  formatReport,
  grade,
  isCorrect,
  rejectionCurve,
  resolveMinAccuracy,
} from '../evaluate.ts'
import type { Milestone } from '../lib/github.ts'
import type { MilestoneSample } from '../lib/loadSamples.ts'
import type { VoteResult } from '../lib/tallyVotes.ts'

const rows: EvalRow[] = [
  // assigned, and right
  { expected: 'A', predicted: 'A', guess: 'A', assigned: true, agreement: 1, tied: false, confidence: 'high' },
  // assigned, and wrong
  { expected: 'B', predicted: 'A', guess: 'A', assigned: true, agreement: 0.9, tied: false, confidence: 'high' },
  // asked, though a milestone did fit
  { expected: 'C', predicted: null, guess: 'A', assigned: false, agreement: 0.4, tied: false, confidence: 'low' },
  // asked, and asking was right
  { expected: null, predicted: null, guess: null, assigned: false, agreement: 0.6, tied: false, confidence: 'medium' },
  // assigned, though nothing fitted
  { expected: null, predicted: 'A', guess: 'A', assigned: true, agreement: 1, tied: false, confidence: 'high' },
]

describe('computeMetrics', () => {
  it('counts a correct refusal to assign as correct', () => {
    const metrics = computeMetrics(rows)
    expect(metrics.correct.count).toBe(2)
    expect(metrics.correct.fraction).toBeCloseTo(0.4)
  })

  it('breaks the outcomes down by what the workflow actually did', () => {
    expect(computeMetrics(rows).outcomes).toEqual({
      assignedCorrect: 1,
      assignedWrong: 2,
      askedButFitted: 1,
      askedCorrectly: 1,
      withheldButCorrect: 0,
    })
  })

  it('counts a correct guess the gate withheld, which is what relaxing the gate would recover', () => {
    const withheld: EvalRow = {
      expected: 'C',
      predicted: null,
      guess: 'C',
      assigned: false,
      agreement: 0.5,
      tied: false,
      confidence: 'medium',
    }
    expect(computeMetrics([...rows, withheld]).outcomes.withheldButCorrect).toBe(1)
  })

  it('measures precision over assignments only, since only those are silent', () => {
    const metrics = computeMetrics(rows)
    expect(metrics.precision).toMatchObject({ count: 1, total: 3 })
    expect(metrics.precision.fraction).toBeCloseTo(1 / 3)
  })

  it('builds a confusion matrix keyed expected → predicted', () => {
    const metrics = computeMetrics(rows)
    expect(metrics.confusion['B']).toEqual({ A: 1 })
    expect(metrics.confusion['C']).toEqual({ '«none»': 1 })
    expect(metrics.confusion['«none»']).toEqual({ '«none»': 1, A: 1 })
  })

  it('groups calibration by agreement tier and confidence level', () => {
    const metrics = computeMetrics(rows)
    expect(metrics.calibration['confidence:high']).toEqual({ total: 3, correct: 1 })
    expect(metrics.calibration['agreement<0.5']).toEqual({ total: 1, correct: 0 })
  })

  it('handles an empty row set without dividing by zero', () => {
    const metrics = computeMetrics([])
    expect(metrics.total).toBe(0)
    expect(metrics.correct.fraction).toBe(0)
    expect(metrics.precision.fraction).toBe(0)
  })
})

describe('formatReport', () => {
  it('lists mismatches and omits correct predictions', () => {
    const report = formatReport(computeMetrics(rows))
    expect(report).toContain('B → A')
    expect(report).not.toContain('A → A')
  })

  it('says so when nothing was miscategorized', () => {
    expect(formatReport(computeMetrics([rows[0]]))).toContain('(none)')
  })
})

describe('resolveMinAccuracy', () => {
  it('defaults when nothing is set', () => {
    expect(resolveMinAccuracy({})).toBe(0.66)
  })

  it('reads the floor from the environment', () => {
    expect(resolveMinAccuracy({ MILESTONE_MIN_ACCURACY: '0.85' })).toBe(0.85)
  })

  it('throws on a value outside 0–1', () => {
    expect(() => resolveMinAccuracy({ MILESTONE_MIN_ACCURACY: '85' })).toThrow(/MILESTONE_MIN_ACCURACY/)
  })
})

describe('grade', () => {
  const milestones: Milestone[] = [{ number: 20, title: '🧤 Drag & Drop', description: '' }]

  /** Builds a sample whose issue number identifies it in the graded output. */
  const sample = (issue: number): MilestoneSample => ({
    input: { title: `issue ${issue}`, body: 'body', labels: [] },
    expected: '🧤 Drag & Drop',
    split: 'test',
    source: { type: 'github', issue },
  })

  const selection: VoteResult = {
    milestone: '🧤 Drag & Drop',
    agreement: 1,
    validVotes: 5,
    totalVotes: 5,
    tied: false,
    confidence: 'high',
    rationale: '',
    secondChoice: null,
  }

  it('records a failed sample and keeps grading the rest', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // The second sample fails the way a transient network fault does, after its own retries.
    const select = vi
      .fn()
      .mockResolvedValueOnce(selection)
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(selection)

    const { rows, failures } = await grade([sample(1), sample(2), sample(3)], milestones, 'i', 'k', select)

    expect(rows.map(row => row.issue)).toEqual([1, 3])
    expect(failures).toEqual([{ issue: 2, message: 'fetch failed' }])
    vi.restoreAllMocks()
  })

  it('grades every sample when nothing fails', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const { rows, failures } = await grade(
      [sample(1), sample(2)],
      milestones,
      'i',
      'k',
      vi.fn().mockResolvedValue(selection),
    )
    expect(rows).toHaveLength(2)
    expect(failures).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

/** Builds a graded row with a given outcome and score, for the signal metrics. */
const row = (issue: number, correct: boolean, agreement: number): EvalRow => ({
  issue,
  expected: 'A',
  predicted: correct ? 'A' : 'B',
  guess: correct ? 'A' : 'B',
  assigned: true,
  agreement,
  tied: false,
  confidence: 'high',
})

/** Scores a row by its vote agreement, the signal these tests exercise. */
const byAgreement = (r: EvalRow) => r.agreement

describe('isCorrect', () => {
  it('scores the guess, not the gated prediction', () => {
    // A withheld row still has a guess, and that is what a confidence signal has to rank.
    expect(isCorrect({ ...row(1, true, 1), predicted: null, assigned: false })).toBe(true)
  })

  it('treats a correct abstention as correct', () => {
    expect(isCorrect({ ...row(1, true, 1), expected: null, guess: null, predicted: null })).toBe(true)
  })

  it('treats declining when a milestone fitted as incorrect', () => {
    expect(isCorrect({ ...row(1, true, 1), expected: 'A', guess: null, predicted: null })).toBe(false)
  })
})

describe('auroc', () => {
  it('is 1 when the score separates correct from wrong perfectly', () => {
    expect(auroc([row(1, true, 1), row(2, true, 0.9), row(3, false, 0.5)], byAgreement)).toBe(1)
  })

  it('is 0 when the score is exactly reversed', () => {
    expect(auroc([row(1, true, 0.2), row(2, false, 0.8), row(3, false, 0.9)], byAgreement)).toBe(0)
  })

  it('is 0.5 for a constant score, not 0', () => {
    // Without the half-credit term for ties an inert signal would read as perfectly inverted.
    expect(auroc([row(1, true, 0.8), row(2, false, 0.8), row(3, true, 0.8)], byAgreement)).toBe(0.5)
  })

  it('is undefined when every row is correct', () => {
    expect(auroc([row(1, true, 1), row(2, true, 0.5)], byAgreement)).toBeNull()
  })

  it('is undefined when every row is wrong', () => {
    expect(auroc([row(1, false, 1), row(2, false, 0.5)], byAgreement)).toBeNull()
  })
})

describe('auarc', () => {
  it('averages accuracy across every coverage level', () => {
    // Ranked perfectly: 1/1, 2/2, 2/3 → mean 0.889.
    expect(auarc([row(1, true, 1), row(2, true, 0.9), row(3, false, 0.1)], byAgreement)).toBeCloseTo(0.889, 3)
  })

  it('does not depend on the order rows arrive in', () => {
    const rows = [row(1, true, 1), row(2, false, 0.4), row(3, true, 0.9), row(4, false, 0.2)]
    expect(auarc([...rows].reverse(), byAgreement)).toBeCloseTo(auarc(rows, byAgreement), 10)
  })

  it('is 1 when every row is correct, matching base accuracy', () => {
    expect(auarc([row(1, true, 0.8), row(2, true, 0.8)], byAgreement)).toBe(1)
  })
})

describe('rejectionCurve', () => {
  it('emits one point per distinct score', () => {
    const curve = rejectionCurve([row(1, true, 1), row(2, true, 1), row(3, false, 0.6)], byAgreement)
    expect(curve.map(p => p.threshold)).toEqual([1, 0.6])
  })

  it('emits exactly two points for a two-valued signal', () => {
    const rows = [row(1, true, 1), row(2, false, 0), row(3, true, 1), row(4, false, 0)]
    expect(rejectionCurve(rows, byAgreement)).toHaveLength(2)
  })

  it('increases coverage monotonically as the threshold falls', () => {
    const curve = rejectionCurve([row(1, true, 1), row(2, true, 0.8), row(3, false, 0.6)], byAgreement)
    expect(curve.map(p => p.coverage)).toEqual([1 / 3, 2 / 3, 1])
  })

  it('collapses a constant score to one flat point at base accuracy', () => {
    // The exact form of "a constant signal is inert". AUARC only equals base accuracy in
    // expectation over tied orderings, so this is where that property is asserted exactly.
    const rows = [row(1, true, 0.8), row(2, false, 0.8), row(3, true, 0.8), row(4, false, 0.8)]
    const curve = rejectionCurve(rows, byAgreement)
    expect(curve).toHaveLength(1)
    expect(curve[0].coverage).toBe(1)
    expect(curve[0].accuracy).toBe(0.5)
  })
})
