import { describe, expect, it } from 'vitest'
import formatQuestion from '../formatQuestion.ts'
import type { Selection } from '../selectMilestone.ts'

/** A withheld selection that still landed on a milestone, for tests to vary one property at a time. */
const withheld: Selection = {
  milestone: '🫧 Liminal UI',
  agreement: 0.6,
  validVotes: 5,
  totalVotes: 5,
  tied: false,
  confidence: 'medium',
  rationale: 'The issue is about preloading background images for the new UI.',
  secondChoice: '📐 Layout',
  assign: false,
  reasons: ['confidence was medium, below the required high'],
}

describe('formatQuestion', () => {
  it('asks the maintainer by name', () => {
    expect(formatQuestion(withheld)).toContain('@raineorshine Which milestone should this issue go in?')
  })

  it('states every reason the milestone was withheld', () => {
    const body = formatQuestion({
      ...withheld,
      reasons: ['the votes were split evenly between milestones', 'confidence was low, below the required high'],
    })
    expect(body).toContain(
      'No milestone was assigned: the votes were split evenly between milestones; confidence was low, below the required high.',
    )
  })

  it('names the closest guess with its agreement, so answering is confirming rather than categorizing', () => {
    expect(formatQuestion(withheld)).toContain(
      'Closest guess: **🫧 Liminal UI** — 60% of 5 votes agreed, confidence medium.',
    )
  })

  it('offers the second choice when there is one', () => {
    expect(formatQuestion(withheld)).toContain('Second choice: 📐 Layout.')
  })

  it('omits the second choice line when there is none', () => {
    expect(formatQuestion({ ...withheld, secondChoice: null })).not.toContain('Second choice')
  })

  it('omits a second choice that merely repeats the guess', () => {
    expect(formatQuestion({ ...withheld, secondChoice: '🫧 Liminal UI' })).not.toContain('Second choice')
  })

  it('does not say "1 votes"', () => {
    const body = formatQuestion({ ...withheld, validVotes: 1, agreement: 1 })
    expect(body).toContain('100% of 1 vote agreed')
  })

  it('quotes the rationale', () => {
    expect(formatQuestion(withheld)).toContain('> The issue is about preloading background images for the new UI.')
  })

  it('omits the rationale line when the model gave none', () => {
    expect(formatQuestion({ ...withheld, rationale: '' })).not.toContain('>')
  })

  it('offers no guess when no milestone fitted at all', () => {
    const body = formatQuestion({
      ...withheld,
      milestone: null,
      secondChoice: null,
      reasons: ['no existing milestone fits this issue'],
      rationale: 'This is a process discussion rather than a change to the app.',
    })
    expect(body).not.toContain('Closest guess')
    expect(body).toContain('No milestone was assigned: no existing milestone fits this issue.')
    expect(body).toContain('> This is a process discussion rather than a change to the app.')
  })

  it('renders as markdown with blank lines between blocks, not one run-on paragraph', () => {
    expect(formatQuestion(withheld).split('\n\n')).toHaveLength(4)
  })
})
