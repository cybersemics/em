import { describe, expect, it } from 'vitest'
import buildPrompt from '../buildPrompt.js'

describe('buildPrompt', () => {
  it('builds prompt with issue', () => {
    const issue = { title: 'Fix bug', body: 'Something is broken', labels: ['bug'] }
    const result = buildPrompt([], issue)

    expect(result).toContain('Fix bug')
    expect(result).toContain('Something is broken')
    expect(result).toContain('bug')
    expect(result).toContain('{"estimate": "<CATEGORY>"}')
  })

  it('includes samples when provided', () => {
    const samples = [
      {
        input: { title: 'Sample issue', body: 'Sample body', labels: ['feature'] },
        expected: 'M',
      },
    ]
    const issue = { title: 'New issue', body: 'New body', labels: [] }
    const result = buildPrompt(samples, issue)

    expect(result).toContain('## Examples')
    expect(result).toContain('Sample issue')
    expect(result).toContain('Expected estimate: M')
  })

  it('omits examples section when no samples', () => {
    const result = buildPrompt([], { title: 'T', body: 'B', labels: [] })
    expect(result).not.toContain('## Examples')
  })
})
