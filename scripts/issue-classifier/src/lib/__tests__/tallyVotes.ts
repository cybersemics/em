import { describe, expect, it } from 'vitest'
import tallyVotes from '../tallyVotes.ts'

const TITLES = ['🧤 Drag & Drop', '📐 Layout', '👆 Multiselect']

/** Renders one model vote as the raw JSON string the tally receives. */
const vote = (milestone: string | null, confidence = 'high', extra: Record<string, unknown> = {}) =>
  JSON.stringify({ rationale: 'because', milestone, confidence, ...extra })

describe('tallyVotes', () => {
  it('returns the modal milestone and its agreement', () => {
    const result = tallyVotes([vote('🧤 Drag & Drop'), vote('🧤 Drag & Drop'), vote('📐 Layout')], TITLES)
    expect(result).toMatchObject({ milestone: '🧤 Drag & Drop', validVotes: 3, totalVotes: 3, tied: false })
    expect(result!.agreement).toBeCloseTo(2 / 3)
  })

  it('resolves each vote against the open milestones before tallying', () => {
    const result = tallyVotes([vote('Drag and Drop'), vote('🧤 drag & drop')], TITLES)
    expect(result).toMatchObject({ milestone: '🧤 Drag & Drop', agreement: 1, validVotes: 2 })
  })

  it('counts an explicit null as a real candidate', () => {
    const result = tallyVotes([vote(null), vote(null), vote('📐 Layout')], TITLES)
    expect(result).toMatchObject({ milestone: null, validVotes: 3 })
    expect(result!.agreement).toBeCloseTo(2 / 3)
  })

  it('discards a vote that names a milestone which is not open', () => {
    const result = tallyVotes([vote('🥞 Flat Render'), vote('📐 Layout')], TITLES)
    expect(result).toMatchObject({ milestone: '📐 Layout', validVotes: 1, totalVotes: 2, agreement: 1 })
  })

  it('discards a vote that does not parse, without losing the rest', () => {
    const result = tallyVotes(['not json', vote('📐 Layout'), vote('📐 Layout')], TITLES)
    expect(result).toMatchObject({ milestone: '📐 Layout', validVotes: 2, totalVotes: 3 })
  })

  it('flags a tie, and still reports a winner', () => {
    const result = tallyVotes([vote('🧤 Drag & Drop'), vote('📐 Layout')], TITLES)
    expect(result!.tied).toBe(true)
    // The winner is what gets assigned; the flag exists so ties can be measured.
    expect(result!.milestone).toBe('🧤 Drag & Drop')
  })

  it('carries the rationale, confidence, and second choice from a winning vote', () => {
    const result = tallyVotes(
      [
        vote('📐 Layout', 'medium', { rationale: 'Superscript sits too high.', secondChoice: 'Multiselect' }),
        vote('📐 Layout', 'medium'),
      ],
      TITLES,
    )
    expect(result).toMatchObject({
      confidence: 'medium',
      rationale: 'Superscript sits too high.',
      secondChoice: '👆 Multiselect',
    })
  })

  it('drops a second choice that is not an open milestone', () => {
    const result = tallyVotes([vote('📐 Layout', 'high', { secondChoice: '🥞 Flat Render' })], TITLES)
    expect(result!.secondChoice).toBeNull()
  })

  it('returns null when no vote is usable, so the caller can retry', () => {
    expect(tallyVotes(['not json', '{}', vote('🥞 Flat Render')], TITLES)).toBeNull()
  })

  it('calls it a refactor on a majority, and reports the count', () => {
    const result = tallyVotes(
      [
        vote('📐 Layout', 'high', { refactor: true }),
        vote('📐 Layout', 'high', { refactor: true }),
        vote('📐 Layout', 'high'),
      ],
      TITLES,
    )
    expect(result).toMatchObject({ refactor: true, refactorVotes: 2, milestone: '📐 Layout' })
  })

  it('counts refactor votes across differing milestones, since the two are independent', () => {
    // "This is a pure refactor" is the same claim whichever subsystem the vote named.
    const result = tallyVotes(
      [
        vote('📐 Layout', 'high', { refactor: true }),
        vote('🧤 Drag & Drop', 'high', { refactor: true }),
        vote('👆 Multiselect', 'high'),
      ],
      TITLES,
    )
    expect(result).toMatchObject({ refactor: true, refactorVotes: 2 })
  })

  it('does not call it a refactor on an even split, which is the recoverable mistake', () => {
    const result = tallyVotes(
      [vote('📐 Layout', 'high', { refactor: true }), vote('📐 Layout', 'high', { refactor: false })],
      TITLES,
    )
    expect(result).toMatchObject({ refactor: false, refactorVotes: 1 })
  })

  it('ignores a refactor vote that named a milestone which is not open', () => {
    // The vote was already discarded as invalid output; it must not vote on refactor-ness either.
    const result = tallyVotes([vote('🥞 Flat Render', 'high', { refactor: true }), vote('📐 Layout', 'high')], TITLES)
    expect(result).toMatchObject({ refactor: false, refactorVotes: 0, validVotes: 1 })
  })

  it('keeps the refactor verdict independent of which milestone won', () => {
    const result = tallyVotes(
      [vote(null, 'high', { refactor: true }), vote(null, 'high', { refactor: true }), vote('📐 Layout', 'high')],
      TITLES,
    )
    expect(result).toMatchObject({ milestone: null, refactor: true })
  })
})
