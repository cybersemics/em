import EverhourClient from '../everhour/client.ts'
import { CATEGORY_TO_HOURS, type EstimateCategory, categoryToSeconds } from '../everhour/estimates.ts'
import buildPrompt, { type IssueInput } from './buildPrompt.ts'
import inference from './inference.ts'
import type { EstimateSample } from './loadSamples.ts'
import tallyVotes from './tallyVotes.ts'

/** An issue estimate expressed as a category and its equivalent hours and seconds, plus vote confidence signals. */
export interface Estimate {
  category: EstimateCategory
  hours: number
  seconds: number
  /** Fraction of valid votes that agreed with the chosen category (0–1). */
  agreement: number
  /** Self-reported confidence carried from a winning vote. */
  confidence: 'high' | 'medium' | 'low'
  /** Rationale carried from a winning vote, for the audit trail. */
  rationale: string
  /** Second-choice category from a winning vote, if provided. */
  secondChoice?: EstimateCategory
}

/**
 * Runs AI inference on a single issue and writes the resulting estimate to Everhour.
 * Shared by the issue-opened (issue.ts) and backfill (backfill.ts) entry points so the
 * prompt → inference → validation → Everhour write pipeline lives in a single place,
 * including the dry-run guards that independently disable inference and the Everhour write.
 *
 * Returns null when dryRunAI is set (no inference is performed).
 */
const estimateIssue = async ({
  issue,
  issueRef,
  issueUrl = '',
  instructions,
  samples,
  openaiApiKey,
  everhour,
  taskId,
  dryRunAI = false,
  dryRunEverhour = false,
}: {
  issue: IssueInput
  /** Issue reference label (`#N`, as an OSC 8 terminal hyperlink locally) for log output; see issueLink. */
  issueRef: string
  /** Trailing ` - <url>` suffix appended at the end of log lines in CI; empty locally. See issueUrlSuffix. */
  issueUrl?: string
  instructions: string
  samples: EstimateSample[]
  /** OpenAI API key passed through to the inference call. */
  openaiApiKey: string
  everhour: EverhourClient
  taskId: string
  dryRunAI?: boolean
  dryRunEverhour?: boolean
}): Promise<Estimate | null> => {
  // Skip AI inference entirely in AI dry-run mode.
  if (dryRunAI) {
    console.info(`[DRY_RUN_AI] Would estimate ${issueRef} "${issue.title}"${issueUrl}`)
    return null
  }

  const prompt = buildPrompt(samples, issue)
  const outputs = await inference({ apiKey: openaiApiKey, prompt, instructions })
  const vote = tallyVotes(outputs)
  const estimate: Estimate = {
    category: vote.estimate,
    hours: CATEGORY_TO_HOURS[vote.estimate],
    seconds: categoryToSeconds(vote.estimate),
    agreement: vote.agreement,
    confidence: vote.confidence,
    rationale: vote.rationale,
    secondChoice: vote.secondChoice,
  }

  // Write the estimate to Everhour unless the Everhour write is being dry-run.
  if (dryRunEverhour) {
    console.info(
      `[DRY_RUN_EVERHOUR] Would set Everhour estimate for ${issueRef} "${issue.title}": ${estimate.category} / ${estimate.hours}h${issueUrl}`,
    )
  } else {
    await everhour.setEstimate(taskId, estimate.seconds)
  }

  return estimate
}

export default estimateIssue
