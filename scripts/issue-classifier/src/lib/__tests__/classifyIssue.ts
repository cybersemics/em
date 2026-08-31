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
  // Unlabeled, as a newly opened issue is: the repository has no issue templates, so nothing applies
  // a label before the classifier runs. Tests that need a human's label add one explicitly.
  labels: [],
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
  label: 'bug',
  labelVotes: 5,
  rationale: 'The drop indicator is misplaced.',
  secondChoice: null,
}

/** A vote that named the refactor kind, on top of naming a milestone. */
const REFACTOR: VoteResult = { ...ASSIGNABLE, label: 'refactor', labelVotes: 4 }

/** Builds a GitHub gateway backed by the given issue and milestones, recording every write. */
const createGitHub = (issue: Issue = ISSUE, milestones: Milestone[] = MILESTONES) => {
  // Typed parameters so the recorded calls stay inspectable, e.g. comment.mock.calls[0][1].
  const setMilestone = vi.fn(async (issueNumber: number, milestoneNumber: number) => {})
  const addLabels = vi.fn(async (issueNumber: number, labels: string[]) => {})
  const comment = vi.fn(async (issueNumber: number, body: string) => {})
  const github: GitHubGateway = {
    getIssue: async () => issue,
    listOpenMilestones: async () => milestones,
    setMilestone,
    addLabels,
    comment,
  }
  return { github, setMilestone, addLabels, comment }
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

  it('asks a human when the votes named no milestone and the kind is not cross-cutting', async () => {
    const { github, setMilestone, addLabels, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...ASSIGNABLE, milestone: null }),
    })

    expect(result).toMatchObject({ action: 'asked', label: 'bug' })
    expect(setMilestone).not.toHaveBeenCalled()
    expect(comment.mock.calls[0][1]).toContain('@raineorshine')
    // The kind is still recorded on an issue nobody could place.
    expect(addLabels).toHaveBeenCalledWith(4839, ['bug'])
  })

  it('labels the kind and still assigns the milestone, since the two are independent', async () => {
    const { github, setMilestone, addLabels, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => REFACTOR,
    })

    expect(result).toMatchObject({ action: 'assigned', milestone: '🧤 Drag & Drop', label: 'refactor' })
    expect(setMilestone).toHaveBeenCalledWith(4839, 20)
    expect(addLabels).toHaveBeenCalledWith(4839, ['refactor'])
    expect(comment).not.toHaveBeenCalled()
  })

  it('labels a refactor that fits no milestone instead of asking, since that is an answer', async () => {
    const { github, setMilestone, addLabels, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...REFACTOR, milestone: null }),
    })

    expect(result).toMatchObject({ action: 'labeled', milestone: null, label: 'refactor' })
    expect(addLabels).toHaveBeenCalledWith(4839, ['refactor'])
    expect(setMilestone).not.toHaveBeenCalled()
    expect(comment).not.toHaveBeenCalled()
  })

  it('adds no label when the votes named no kind', async () => {
    const { github, addLabels } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...ASSIGNABLE, label: null, labelVotes: 3 }),
    })

    expect(result).toMatchObject({ action: 'assigned', label: null })
    expect(addLabels).not.toHaveBeenCalled()
  })

  it('does not re-add a label the issue already carries', async () => {
    const { github, addLabels } = createGitHub({ ...ISSUE, labels: ['refactor'] })
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => REFACTOR,
    })

    expect(result).toMatchObject({ action: 'assigned', label: 'refactor' })
    expect(addLabels).not.toHaveBeenCalled()
  })

  it('never contradicts a kind a human already chose', async () => {
    // Adding `bug` beside a human's `refactor` would leave the issue claiming to be both.
    const { github, addLabels } = createGitHub({ ...ISSUE, labels: ['refactor'] })
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ASSIGNABLE,
    })

    expect(result).toMatchObject({ action: 'assigned', label: 'refactor' })
    expect(addLabels).not.toHaveBeenCalled()
  })

  it('honors a human refactor label when suppressing the question', async () => {
    // A re-dispatch must not comment on an issue a human already typed as cross-cutting, whatever
    // the votes made of it this time.
    const { github, comment } = createGitHub({ ...ISSUE, labels: ['refactor'] })
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      select: async () => ({ ...ASSIGNABLE, milestone: null, label: null, labelVotes: 3 }),
    })

    expect(result).toMatchObject({ action: 'labeled', milestone: null, label: 'refactor' })
    expect(comment).not.toHaveBeenCalled()
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

  it('writes nothing in a dry run, label included', async () => {
    const { github, setMilestone, addLabels, comment } = createGitHub()
    const result = await classifyIssue({
      github,
      issueNumber: 4839,
      instructions: 'instructions',
      openaiApiKey: 'test-key',
      dryRun: true,
      select: async () => REFACTOR,
    })

    expect(result).toMatchObject({ action: 'assigned', milestone: '🧤 Drag & Drop', label: 'refactor' })
    expect(setMilestone).not.toHaveBeenCalled()
    expect(addLabels).not.toHaveBeenCalled()
    expect(comment).not.toHaveBeenCalled()
  })
})
