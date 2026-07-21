import { describe, expect, it } from 'vitest'
import promptVersionLink from '../promptVersionLink.ts'

describe('promptVersionLink', () => {
  const sha = '630ac1b41f903625bbf6a1c6aa18461bb192a0a0'

  it('links the abbreviated hash to the instructions file at the full commit SHA', () => {
    const result = promptVersionLink('cybersemics', 'em', sha)
    const url = `https://github.com/cybersemics/em/blob/${sha}/.github/instructions/estimate/estimate.instructions.md`
    expect(result).toBe(`[630ac1b](${url})`)
  })

  it('embeds the full SHA in the URL and shows the short hash as link text', () => {
    const result = promptVersionLink('cybersemics', 'em', sha)
    expect(result).toContain(`/blob/${sha}/`)
    expect(result).toContain('[630ac1b]')
  })

  it('returns plain text without a link when the version is unknown', () => {
    expect(promptVersionLink('cybersemics', 'em', 'unknown')).toBe('unknown')
  })
})
