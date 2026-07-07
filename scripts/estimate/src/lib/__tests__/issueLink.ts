import { describe, expect, it } from 'vitest'
import issueLink from '../issueLink.ts'

describe('issueLink', () => {
  it('wraps the visible #N in an OSC 8 hyperlink to the issue URL', () => {
    const result = issueLink('cybersemics', 'em', 123)
    const url = 'https://github.com/cybersemics/em/issues/123'
    expect(result).toBe(`\u001b]8;;${url}\u001b\\#123\u001b]8;;\u001b\\`)
  })

  it('embeds the target URL and the plain #N fallback text', () => {
    const result = issueLink('cybersemics', 'em', 4302)
    expect(result).toContain('https://github.com/cybersemics/em/issues/4302')
    expect(result).toContain('#4302')
  })
})
