import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import issueLink from '../issueLink.ts'

describe('issueLink', () => {
  const originalCI = process.env.CI

  afterEach(() => {
    // Restore the original CI value so cases don't leak into each other.
    if (originalCI === undefined) {
      delete process.env.CI
    } else {
      process.env.CI = originalCI
    }
  })

  describe('in CI', () => {
    beforeEach(() => {
      process.env.CI = 'true'
    })

    it('renders the plain #N label with no URL (the URL is appended separately at line end)', () => {
      const result = issueLink('cybersemics', 'em', 33)
      expect(result).toBe('#33')
    })

    it('does not emit any OSC 8 escape sequence', () => {
      const result = issueLink('cybersemics', 'em', 33)
      expect(result).not.toContain('\u001b]8')
    })
  })

  describe('outside CI', () => {
    beforeEach(() => {
      delete process.env.CI
    })

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

    it('treats CI=false as not in CI', () => {
      process.env.CI = 'false'
      const result = issueLink('cybersemics', 'em', 7)
      expect(result).toContain('\u001b]8')
    })
  })
})
