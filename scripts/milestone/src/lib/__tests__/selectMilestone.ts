import { describe, expect, it, vi } from 'vitest'
import type { Milestone } from '../github.ts'
import selectMilestone from '../selectMilestone.ts'

const MILESTONES: Milestone[] = [
  { number: 20, title: '🧤 Drag & Drop', description: '' },
  { number: 42, title: '📐 Layout', description: '' },
]

const ISSUE = { title: 'Drop indicator is misplaced', body: 'One row too low.', labels: ['bug'] }

/** Renders one model vote as the raw JSON string inference would return. */
const vote = (milestone: string | null, confidence = 'high') =>
  JSON.stringify({ rationale: 'because', milestone, confidence })

/** Builds the fixed options every case shares, with the inference call injected per test. */
const options = (infer: () => Promise<string[]>) => ({
  issue: ISSUE,
  milestones: MILESTONES,
  instructions: 'instructions',
  openaiApiKey: 'test-key',
  infer,
})

describe('selectMilestone', () => {
  it('returns the tallied selection with the gate applied', async () => {
    const selection = await selectMilestone(options(async () => [vote('🧤 Drag & Drop'), vote('🧤 Drag & Drop')]))
    expect(selection).toMatchObject({ milestone: '🧤 Drag & Drop', assign: true, reasons: [] })
  })

  it('withholds a selection the gate rejects', async () => {
    const selection = await selectMilestone(options(async () => [vote('🧤 Drag & Drop', 'medium')]))
    expect(selection.assign).toBe(false)
    expect(selection.milestone).toBe('🧤 Drag & Drop')
  })

  it('does not retry a selection of "no milestone", which is a real answer', async () => {
    const infer = vi.fn(async () => [vote(null), vote(null)])
    const selection = await selectMilestone(options(infer))
    expect(infer).toHaveBeenCalledTimes(1)
    expect(selection).toMatchObject({ milestone: null, assign: false })
  })

  it('retries when every vote in an attempt is unusable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infer = vi
      .fn()
      .mockResolvedValueOnce(['not json'])
      .mockResolvedValueOnce([vote('📐 Layout')])
    const selection = await selectMilestone(options(infer))
    expect(infer).toHaveBeenCalledTimes(2)
    expect(selection.milestone).toBe('📐 Layout')
    vi.restoreAllMocks()
  })

  it('retries when inference throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infer = vi
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce([vote('📐 Layout')])
    expect((await selectMilestone(options(infer))).milestone).toBe('📐 Layout')
    expect(infer).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })

  it('throws after three failed attempts rather than assigning nothing quietly', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infer = vi.fn(async () => ['not json'])
    await expect(selectMilestone(options(infer))).rejects.toThrow(/failed after 3 attempts/)
    expect(infer).toHaveBeenCalledTimes(3)
    vi.restoreAllMocks()
  })
})
