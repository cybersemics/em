import { describe, expect, it } from 'vitest'
import buildPrompt from '../buildPrompt'

describe('buildPrompt', () => {
  it('builds prompt with instructions and issue', () => {
    const instructions = '# Test Instructions\nEstimate issues.'
    const issue = { title: 'Fix bug', body: 'Something is broken', labels: ['bug'] }
    const result = buildPrompt(instructions, [], issue)

    expect(result).toContain('# Test Instructions')
    expect(result).toContain('Fix bug')
    expect(result).toContain('Something is broken')
    expect(result).toContain('bug')
    expect(result).toContain('{"estimate": "<CATEGORY>"}')
  })

  it('includes samples when provided', () => {
    const instructions = 'Instructions'
    const samples = [
      {
        input: { title: 'Sample issue', body: 'Sample body', labels: ['feature'] },
        expected: 'M',
      },
    ]
    const issue = { title: 'New issue', body: 'New body', labels: [] }
    const result = buildPrompt(instructions, samples, issue)

    expect(result).toContain('## Examples')
    expect(result).toContain('Sample issue')
    expect(result).toContain('Expected estimate: M')
  })

  it('omits examples section when no samples', () => {
    const result = buildPrompt('Instructions', [], { title: 'T', body: 'B', labels: [] })
    expect(result).not.toContain('## Examples')
  })
})
