import { describe, expect, it } from 'vitest'
import extractIssueNumber from '../extractIssueNumber.ts'

describe('extractIssueNumber', () => {
  it('extracts from standard Everhour GitHub task ID (gh:REPO:ISSUE)', () => {
    expect(extractIssueNumber({ id: 'gh:143808059:3977', name: 'Some issue' })).toBe(3977)
  })

  it('extracts from task IDs with more than 3 segments', () => {
    expect(extractIssueNumber({ id: 'gh:org:repo:42', name: 'Another issue' })).toBe(42)
  })

  it('falls back to foreignId when task ID has fewer than 3 segments', () => {
    expect(extractIssueNumber({ id: 'some-task-id', name: 'No number here', foreignId: '99' })).toBe(99)
  })

  it('ignores a non-numeric foreignId', () => {
    expect(extractIssueNumber({ id: 'some-task-id', name: 'No number here', foreignId: 'abc' })).toBeNull()
  })

  it('extracts #NUMBER at the start of the task name', () => {
    expect(extractIssueNumber({ id: 'manual', name: '#123 Doubly-linked Items' })).toBe(123)
  })

  it('extracts #NUMBER anywhere in the task name', () => {
    expect(extractIssueNumber({ id: 'manual', name: 'Fix bug (#456)' })).toBe(456)
  })

  it('returns null when no issue number can be found (manually created task)', () => {
    expect(extractIssueNumber({ id: 'manual', name: 'Doubly-linked Items' })).toBeNull()
  })

  it('extracts from the GitHub URL when the task ID is gh:ISSUE_ID (2 segments)', () => {
    expect(
      extractIssueNumber({
        id: 'gh:498948741',
        name: 'Cmd + Shift + H → Home',
        url: 'https://github.com/cybersemics/em/issues/76',
        number: '76',
      }),
    ).toBe(76)
  })

  it('extracts from the number field when the task ID and URL are absent', () => {
    expect(extractIssueNumber({ id: 'gh:498948741', name: 'Some issue', number: '76' })).toBe(76)
  })

  it('prefers the number field over URL scraping', () => {
    expect(
      extractIssueNumber({
        id: 'gh:498948741',
        name: 'Some issue',
        number: '76',
        url: 'https://github.com/cybersemics/em/issues/999',
      }),
    ).toBe(76)
  })

  it('prefers task ID extraction over foreignId', () => {
    expect(extractIssueNumber({ id: 'gh:143808059:100', name: 'Issue', foreignId: '999' })).toBe(100)
  })
})
