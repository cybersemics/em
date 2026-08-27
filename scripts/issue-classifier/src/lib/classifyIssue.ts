import formatQuestion from './formatQuestion.ts'
import type { Issue, Milestone } from './github.ts'
import { LABELS, type Label } from './parseSelection.ts'
import selectMilestone from './selectMilestone.ts'
import type { VoteResult } from './tallyVotes.ts'

/**
 * The one label whose absence of a milestone is an answer rather than a gap.
 *
 * A pure refactor is cross-cutting by definition — it restructures code without belonging to a
 * user-facing subsystem — so finding no milestone for one is correct, not a hole in the taxonomy.
 * That is a claim about what the word means, and it does not generalize to the other labels even
 * though some of them go unmilestoned more often: `test` has ✅ Test Engineering, `agent` has
 * ✨ Agent Workflows, and a `bug`, `feature`, or `performance` issue names work inside some subsystem
 * by definition, so no milestone for one of those is worth a human's attention.
 */
const CROSS_CUTTING_LABEL = 'refactor'

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
   * `assigned` set a milestone, `labeled` applied a label with no milestone to set, `asked` posted a
   * question, `skipped` did nothing.
   */
  action: 'assigned' | 'labeled' | 'asked' | 'skipped'
  /** The milestone assigned, or the closest guess when asking. Null when there was none. */
  milestone: string | null
  /**
   * The kind of work the issue carries after this run, which is the label applied or the one a human
   * had already put there. Null when neither named one.
   */
  label: Label | null
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
 * The label is a second, independent verdict rather than a competing one: it says what kind of work
 * the issue is, not which subsystem owns it, so an issue gets the label *and* its milestone. What it
 * changes is the case where no milestone fits. A pure refactor matching no subsystem is a finished
 * classification rather than a question — see CROSS_CUTTING_LABEL — so the label stands alone and
 * nothing is asked. Every other kind still reaches a human, carrying its label with it.
 *
 * A label a human already applied is never contradicted. The classifier picks exactly one kind, so
 * adding its own beside an existing one would leave the issue reading `bug` and `feature` at once
 * rather than leaving a human's judgment in place.
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

  // Read before any early return so a skipped issue reports the kind it already carries.
  const existingLabel = issue.labels.find((label): label is Label => (LABELS as readonly string[]).includes(label))

  if (issue.isPullRequest) {
    return {
      action: 'skipped',
      milestone: null,
      label: existingLabel ?? null,
      detail: 'it is a pull request, not an issue',
    }
  }
  if (issue.milestone !== null) {
    return {
      action: 'skipped',
      milestone: issue.milestone,
      label: existingLabel ?? null,
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

  // The kind the issue carries once this run is done. A human's label wins outright, which makes the
  // write conditional and the comment rule below stable across a re-dispatch: an issue already
  // labeled `refactor` keeps that answer even on a run whose votes named no kind at all.
  const label = existingLabel ?? selection.label
  const labelDetail =
    label === null
      ? 'no kind was named'
      : label === existingLabel
        ? `it already carries the ${label} label`
        : `labeled ${label} by ${selection.labelVotes} of ${selection.validVotes} votes`
  if (label !== null && label !== existingLabel && !dryRun) {
    await github.addLabels(issueNumber, [label])
  }

  if (selection.milestone !== null) {
    // Always found: every non-null selection was resolved against these same open milestones when
    // the votes were tallied.
    const milestone = milestones.find(candidate => candidate.title === selection.milestone)!
    if (!dryRun) await github.setMilestone(issueNumber, milestone.number)
    return {
      action: 'assigned',
      milestone: milestone.title,
      label,
      detail: `${Math.round(selection.agreement * 100)}% of ${selection.validVotes} votes agreed, confidence ${selection.confidence}; ${labelDetail}`,
    }
  }

  // A refactor that fits no subsystem is classified, not unclassifiable: the label is the answer, so
  // there is nothing left to ask.
  if (label === CROSS_CUTTING_LABEL) {
    return {
      action: 'labeled',
      milestone: null,
      label,
      detail: `${labelDetail}, and the votes named no existing milestone`,
    }
  }

  const question = formatQuestion(selection)
  if (!dryRun) await github.comment(issueNumber, question)
  return {
    action: 'asked',
    milestone: null,
    label,
    detail: `the votes named no existing milestone; ${labelDetail}`,
    question,
  }
}

export default classifyIssue
