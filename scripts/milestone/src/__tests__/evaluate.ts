import { describe, expect, it, vi } from 'vitest'
import { type EvalRow, computeMetrics, formatReport, grade, resolveMinAccuracy } from '../evaluate.ts'
import type { Milestone } from '../lib/github.ts'
import type { MilestoneSample } from '../lib/loadSamples.ts'
import type { Selection } from '../lib/selectMilestone.ts'

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
    expect(resolveMinAccuracy({})).toBe(0.8)
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

  const selection: Selection = {
    milestone: '🧤 Drag & Drop',
    agreement: 1,
    validVotes: 5,
    totalVotes: 5,
    tied: false,
    confidence: 'high',
    rationale: '',
    secondChoice: null,
    assign: true,
    reasons: [],
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
