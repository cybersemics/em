import { describe, expect, it } from 'vitest'
import formatQuestion from '../formatQuestion.ts'
import type { VoteResult } from '../tallyVotes.ts'

/** A vote that named no milestone — now the only outcome that asks a human. */
const noFit: VoteResult = {
  milestone: null,
  agreement: 1,
  validVotes: 5,
  totalVotes: 5,
  tied: false,
  confidence: 'high',
  rationale: 'This is a repository process proposal, not work in an application subsystem.',
  secondChoice: null,
}

describe('formatQuestion', () => {
  it('asks the maintainer by name', () => {
    expect(formatQuestion(noFit)).toContain('@raineorshine Which milestone should this issue go in?')
  })

  it('says that nothing matched, since that is the only reason it is asking', () => {
    expect(formatQuestion(noFit)).toContain('did not match any existing one')
  })

  it('quotes the rationale, which usually says what the issue is about', () => {
    expect(formatQuestion(noFit)).toContain(
      '> This is a repository process proposal, not work in an application subsystem.',
    )
  })

  it('omits the quote when the model gave no rationale', () => {
    expect(formatQuestion({ ...noFit, rationale: '' })).not.toContain('>')
  })
})
