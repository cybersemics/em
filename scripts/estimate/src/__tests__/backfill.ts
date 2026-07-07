import { describe, expect, it } from 'vitest'
import { isPullRequest } from '../backfill.ts'

describe('isPullRequest', () => {
  it('returns false for an issue with no pull_request field', () => {
    expect(isPullRequest({})).toBe(false)
  })

  it('returns false when pull_request is null', () => {
    expect(isPullRequest({ pull_request: null })).toBe(false)
  })

  it('returns true when pull_request is present', () => {
    expect(isPullRequest({ pull_request: { url: 'https://api.github.com/repos/o/r/pulls/215' } })).toBe(true)
  })
})
