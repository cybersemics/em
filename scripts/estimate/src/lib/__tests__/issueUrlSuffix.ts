import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import issueUrlSuffix from '../issueUrlSuffix.ts'

describe('issueUrlSuffix', () => {
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

    it('returns a leading " - " followed by the full issue URL', () => {
      const result = issueUrlSuffix('cybersemics', 'em', 1607)
      expect(result).toBe(' - https://github.com/cybersemics/em/issues/1607')
    })
  })

  describe('outside CI', () => {
    it('returns an empty string when CI is unset', () => {
      delete process.env.CI
      expect(issueUrlSuffix('cybersemics', 'em', 1607)).toBe('')
    })

    it('returns an empty string when CI=false', () => {
      process.env.CI = 'false'
      expect(issueUrlSuffix('cybersemics', 'em', 1607)).toBe('')
    })
  })
})
