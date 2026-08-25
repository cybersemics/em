import { describe, expect, it, vi } from 'vitest'
import classifyIssue, { type GitHubGateway } from '../classifyIssue.ts'
import type { Issue, Milestone } from '../github.ts'
import type { VoteResult } from '../tallyVotes.ts'

const MILESTONES: Milestone[] = [
  { number: 20, title: '🧤 Drag & Drop', description: '' },
  { number: 42, title: '📐 Layout', description: '' },
]

const ISSUE: Issue = {
  number: 4839,
  title: 'Drop indicator is misplaced',
  body: 'One row too low.',
  labels: ['bug'],
  milestone: null,
  isPullRequest: false,
}

/** A vote that named a milestone, for tests to vary one property at a time. */
const ASSIGNABLE: VoteResult = {
  milestone: '🧤 Drag & Drop',
  agreement: 1,
  validVotes: 5,
  totalVotes: 5,
  tied: false,
  confidence: 'high',
  rationale: 'The drop indicator is misplaced.',
  secondChoice: null,
}

/** Builds a GitHub gateway backed by the given issue and milestones, recording every write. */
const createGitHub = (issue: Issue = ISSUE, milestones: Milestone[] = MILESTONES) => {
  // Typed parameters so the recorded calls stay inspectable, e.g. comment.mock.calls[0][1].
  const setMilestone = vi.fn(async (issueNumber: number, milestoneNumber: number) => {})
  const comment = vi.fn(async (issueNumber: number, body: string) => {})
  const github: GitHubGateway = {
    getIssue: async () => issue,
    listOpenMilestones: async () => milestones,
    setMilestone,
    comment,
  }
  return { github, setMilestone, comment }
}

describe('classifyIssue', () => {
  it('assigns the selected milestone by number and posts no comment', async () => {
    const { github, setMilestone, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ASSIGNABLE,
    })

    expect(result).toMatchObject({ action: 'assigned', milestone: '🧤 Drag & Drop' })
    expect(setMilestone).toHaveBeenCalledWith(4839, 20)
    expect(comment).not.toHaveBeenCalled()
  })

  it('asks a human only when the votes named no milestone', async () => {
    const { github, setMilestone, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...ASSIGNABLE, milestone: null }),
    })

    expect(result.action).toBe('asked')
    expect(setMilestone).not.toHaveBeenCalled()
    expect(comment.mock.calls[0][1]).toContain('@raineorshine')
  })

  it('assigns a tied vote rather than asking, taking its modal winner', async () => {
    // A tie is a choice between two plausible buckets, not a failure to find one.
    const { github, setMilestone, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...ASSIGNABLE, tied: true, agreement: 0.4 }),
    })

    expect(result).toMatchObject({ action: 'assigned', milestone: '🧤 Drag & Drop' })
    expect(setMilestone).toHaveBeenCalledWith(4839, 20)
    expect(comment).not.toHaveBeenCalled()
  })

  it('assigns a low-confidence vote, since self-reported confidence carries no signal', async () => {
    const { github, setMilestone } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...ASSIGNABLE, confidence: 'low', agreement: 0.2 }),
    })

    expect(result.action).toBe('assigned')
    expect(setMilestone).toHaveBeenCalledWith(4839, 20)
  })

  it('skips an issue that already has a milestone without running inference', async () => {
    const { github, setMilestone, comment } = createGitHub({ ...ISSUE, milestone: '📐 Layout' })
    const select = vi.fn(async () => ASSIGNABLE)
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select,
    })

    expect(result).toMatchObject({ action: 'skipped', milestone: '📐 Layout' })
    expect(select).not.toHaveBeenCalled()
    expect(setMilestone).not.toHaveBeenCalled()
    expect(comment).not.toHaveBeenCalled()
  })

  it('skips a pull request', async () => {
    const { github, setMilestone, comment } = createGitHub({ ...ISSUE, isPullRequest: true })
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ASSIGNABLE,
    })

    expect(result).toMatchObject({ action: 'skipped' })
    expect(setMilestone).not.toHaveBeenCalled()
    expect(comment).not.toHaveBeenCalled()
  })

  it('explains on the issue and fails when the repository has no open milestones', async () => {
    const { github, setMilestone, comment } = createGitHub(ISSUE, [])
    await expect(
      classifyIssue({
        github,
        issueNumber: 4839,
        instructions: 'instructions',
        openaiApiKey: 'test-key',
        select: async () => ASSIGNABLE,
      }),
    ).rejects.toThrow(/no open milestones/)

    expect(comment.mock.calls[0][1]).toContain('no open milestones')
    expect(setMilestone).not.toHaveBeenCalled()
  })

  it('writes nothing in a dry run', async () => {
    const { github, setMilestone, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      dryRun: true,
      select: async () => ASSIGNABLE,
    })

    expect(result).toMatchObject({ action: 'assigned', milestone: '🧤 Drag & Drop' })
    expect(setMilestone).not.toHaveBeenCalled()
    expect(comment).not.toHaveBeenCalled()
  })
})
