import formatQuestion from './formatQuestion.ts'
import type { GateThresholds } from './gate.ts'
import type { Issue, Milestone } from './github.ts'
import selectMilestone, { type Selection } from './selectMilestone.ts'

/** The GitHub operations the assignment flow needs. GitHubClient satisfies this. */
export interface GitHubGateway {
  getIssue(issueNumber: number): Promise<Issue>
  listOpenMilestones(): Promise<Milestone[]>
  setMilestone(issueNumber: number, milestoneNumber: number): Promise<void>
  comment(issueNumber: number, body: string): Promise<void>
}

/** What the workflow did with one issue. */
export interface AssignResult {
  /** `assigned` set a milestone, `asked` posted a question, `skipped` did nothing. */
  action: 'assigned' | 'asked' | 'skipped'
  /** The milestone assigned, or the closest guess when asking. Null when there was none. */
  milestone: string | null
  /** One-line explanation of the outcome, for the workflow log. */
  detail: string
  /** The comment body, when asking a human. Returned rather than only posted so a dry run can show it. */
  question?: string
}

/** Options for categorizing one issue. */
export interface AssignMilestoneOptions {
  github: GitHubGateway
  issueNumber: number
  instructions: string
  openaiApiKey: string
  thresholds?: GateThresholds
  /** Skips both the milestone assignment and the comment, so a run can be previewed safely. */
  dryRun?: boolean
  /** Selection implementation, injectable so the flow can be tested without model access. */
  select?: (options: Parameters<typeof selectMilestone>[0]) => Promise<Selection>
}

/**
 * Categorizes one issue end to end: read it, decide, and either assign a milestone or ask a human.
 *
 * All GitHub access goes through the injected gateway and all inference through the injected
 * selector, so every branch below — including the ones that are awkward to reach in production, like
 * a repository with no open milestones — is reachable in a deterministic test.
 *
 * Two outcomes are deliberately not errors. An issue that is a pull request, or that already carries
 * a milestone, is skipped silently: a human's choice is never overwritten. Everything else either
 * assigns quietly or asks loudly.
 */
const assignMilestone = async ({
  github,
  issueNumber,
  instructions,
  openaiApiKey,
  thresholds,
  dryRun = false,
  select = selectMilestone,
}: AssignMilestoneOptions): Promise<AssignResult> => {
  const issue = await github.getIssue(issueNumber)

  if (issue.isPullRequest) {
    return { action: 'skipped', milestone: null, detail: 'it is a pull request, not an issue' }
  }
  if (issue.milestone !== null) {
    return { action: 'skipped', milestone: issue.milestone, detail: `it already has the milestone ${issue.milestone}` }
  }

  const milestones = await github.listOpenMilestones()
  if (milestones.length === 0) {
    // A repository with no open milestones cannot be categorized at all. Say so on the issue before
    // failing, so the silence is explained rather than left to be noticed later.
    if (!dryRun) {
      await github.comment(issueNumber, 'No milestone was assigned because this repository has no open milestones.')
    }
    throw new Error('Cannot categorize: the repository has no open milestones.')
  }

  const selection = await select({ issue, milestones, instructions, openaiApiKey, thresholds })

  if (selection.assign) {
    // Always found: the gate never assigns a null milestone, and every non-null selection was
    // already resolved against these same open milestones when the votes were tallied.
    const milestone = milestones.find(candidate => candidate.title === selection.milestone)!
    if (!dryRun) await github.setMilestone(issueNumber, milestone.number)
    return {
      action: 'assigned',
      milestone: milestone.title,
      detail: `${Math.round(selection.agreement * 100)}% of ${selection.validVotes} votes agreed, confidence ${selection.confidence}`,
    }
  }

  const question = formatQuestion(selection)
  if (!dryRun) await github.comment(issueNumber, question)
  return { action: 'asked', milestone: selection.milestone, detail: selection.reasons.join('; '), question }
}

export default assignMilestone
