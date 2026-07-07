import EverhourClient from '../everhour/client.ts'
import { CATEGORY_TO_HOURS, type EstimateCategory, categoryToSeconds } from '../everhour/estimates.ts'
import buildPrompt, { type IssueInput } from './buildPrompt.ts'
import inference from './inference.ts'
import type { EstimateSample } from './loadSamples.ts'
import validateEstimate from './validateEstimate.ts'

/** An issue estimate expressed as a category and its equivalent hours and seconds. */
export interface Estimate {
  category: EstimateCategory
  hours: number
  seconds: number
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
  instructions,
  samples,
  token,
  everhour,
  taskId,
  dryRunAI = false,
  dryRunEverhour = false,
}: {
  issue: IssueInput
  /** Clickable issue reference (`#N` as an OSC 8 terminal hyperlink) for log output; see issueLink. */
  issueRef: string
  instructions: string
  samples: EstimateSample[]
  token: string
  everhour: EverhourClient
  taskId: string
  dryRunAI?: boolean
  dryRunEverhour?: boolean
}): Promise<Estimate | null> => {
  // Skip AI inference entirely in AI dry-run mode.
  if (dryRunAI) {
    console.info(`[DRY_RUN_AI] Would estimate ${issueRef} "${issue.title}"`)
    return null
  }

  const prompt = buildPrompt(samples, issue)
  const outputs = await inference({ token, prompt, instructions })
  const { estimate: category } = validateEstimate(outputs)
  const estimate: Estimate = {
    category,
    hours: CATEGORY_TO_HOURS[category],
    seconds: categoryToSeconds(category),
  }

  // Write the estimate to Everhour unless the Everhour write is being dry-run.
  if (dryRunEverhour) {
    console.info(
      `[DRY_RUN_EVERHOUR] Would set Everhour estimate for ${issueRef} "${issue.title}": ${estimate.category} / ${estimate.hours}h`,
    )
  } else {
    await everhour.setEstimate(taskId, estimate.seconds)
  }

  return estimate
}

export default estimateIssue
