import formatQuestion from './formatQuestion.ts'
import type { Issue, Milestone } from './github.ts'
import selectMilestone from './selectMilestone.ts'
import type { VoteResult } from './tallyVotes.ts'

/** The repository label marking work that restructures code without changing behavior. */
const REFACTOR_LABEL = 'refactor'

/** The GitHub operations the assignment flow needs. GitHubClient satisfies this. */
export interface GitHubGateway {
  getIssue(issueNumber: number): Promise<Issue>
  listOpenMilestones(): Promise<Milestone[]>
  setMilestone(issueNumber: number, milestoneNumber: number): Promise<void>
  addLabels(issueNumber: number, labels: string[]): Promise<void>
  comment(issueNumber: number, body: string): Promise<void>
}

/** What the workflow did with one issue. */
export interface ClassifyResult {
  /**
   * `assigned` set a milestone, `labeled` applied the `refactor` label with no milestone to set,
   * `asked` posted a question, `skipped` did nothing.
   */
  action: 'assigned' | 'labeled' | 'asked' | 'skipped'
  /** The milestone assigned, or the closest guess when asking. Null when there was none. */
  milestone: string | null
  /** Whether the issue was judged a pure refactor. True on `labeled`, and possible on `assigned`. */
  refactor: boolean
  /** One-line explanation of the outcome, for the workflow log. */
  detail: string
  /** The comment body, when asking a human. Returned rather than only posted so a dry run can show it. */
  question?: string
}

/** Options for classifying one issue. */
export interface ClassifyIssueOptions {
  github: GitHubGateway
  issueNumber: number
  instructions: string
  openaiApiKey: string
  /** Skips both the milestone assignment and the comment, so a run can be previewed safely. */
  dryRun?: boolean
  /** Selection implementation, injectable so the flow can be tested without model access. */
  select?: (options: Parameters<typeof selectMilestone>[0]) => Promise<VoteResult>
}

/**
 * Classifies one issue end to end: read it, decide, and either assign a milestone or ask a human.
 *
 * A milestone is assigned whenever the votes name one. Confidence thresholds used to sit here, but
 * the model's self-reported confidence measured AUROC 0.53 — indistinguishable from no signal — so
 * gating on it only withheld milestones from issues it had placed correctly. An unmilestoned issue
 * disappears from every milestone view; a wrongly milestoned one sits visibly out of place, one
 * click from correct.
 *
 * All GitHub access goes through the injected gateway and all inference through the injected
 * selector, so every branch below — including the ones that are awkward to reach in production, like
 * a repository with no open milestones — is reachable in a deterministic test.
 *
 * The `refactor` label is a second, independent verdict rather than a competing one. A pure refactor
 * still belongs to the subsystem it restructures, so it gets the label *and* its milestone; this
 * repository has milestoned refactors that way all along. What the label changes is the other case:
 * a refactor that matches no subsystem is now a finished classification rather than a question, so
 * the label is posted instead of a comment. Only an issue that is neither placeable nor a refactor
 * still reaches a human.
 *
 * Two outcomes are deliberately not errors. An issue that is a pull request, or that already carries
 * a milestone, is skipped silently: a human's choice is never overwritten. Everything else either
 * classifies quietly — a milestone, a label, or both — or asks loudly.
 */
const classifyIssue = async ({
  github,
  issueNumber,
  instructions,
  openaiApiKey,
  dryRun = false,
  select = selectMilestone,
}: ClassifyIssueOptions): Promise<ClassifyResult> => {
  const issue = await github.getIssue(issueNumber)

  if (issue.isPullRequest) {
    return { action: 'skipped', milestone: null, refactor: false, detail: 'it is a pull request, not an issue' }
  }
  if (issue.milestone !== null) {
    return {
      action: 'skipped',
      milestone: issue.milestone,
      refactor: false,
      detail: `it already has the milestone ${issue.milestone}`,
    }
  }

  const milestones = await github.listOpenMilestones()
  if (milestones.length === 0) {
    // A repository with no open milestones cannot be classified at all. Say so on the issue before
    // failing, so the silence is explained rather than left to be noticed later.
    if (!dryRun) {
      await github.comment(issueNumber, 'No milestone was assigned because this repository has no open milestones.')
    }
    throw new Error('Cannot classify: the repository has no open milestones.')
  }

  const selection = await select({ issue, milestones, instructions, openaiApiKey })

  const refactorDetail = `${selection.refactorVotes} of ${selection.validVotes} votes judged it a pure refactor`
  // Re-adding a label the issue already carries is a no-op on GitHub, but the workflow can be
  // dispatched by hand against any issue, and a run that reports a write it did not need to make
  // reads as though a human's label had been overwritten.
  if (selection.refactor && !issue.labels.includes(REFACTOR_LABEL) && !dryRun) {
    await github.addLabels(issueNumber, [REFACTOR_LABEL])
  }

  if (selection.milestone !== null) {
    // Always found: every non-null selection was resolved against these same open milestones when
    // the votes were tallied.
    const milestone = milestones.find(candidate => candidate.title === selection.milestone)!
    if (!dryRun) await github.setMilestone(issueNumber, milestone.number)
    return {
      action: 'assigned',
      milestone: milestone.title,
      refactor: selection.refactor,
      detail: `${Math.round(selection.agreement * 100)}% of ${selection.validVotes} votes agreed, confidence ${selection.confidence}${selection.refactor ? `; ${refactorDetail}` : ''}`,
    }
  }

  // A refactor that fits no subsystem is classified, not unclassifiable: the label is the answer, so
  // there is nothing left to ask.
  if (selection.refactor) {
    return {
      action: 'labeled',
      milestone: null,
      refactor: true,
      detail: `${refactorDetail}, and the votes named no existing milestone`,
    }
  }

  const question = formatQuestion(selection)
  if (!dryRun) await github.comment(issueNumber, question)
  return {
    action: 'asked',
    milestone: null,
    refactor: false,
    detail: 'the votes named no existing milestone',
    question,
  }
}

export default classifyIssue
