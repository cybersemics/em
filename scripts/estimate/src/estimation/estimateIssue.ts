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
 * Runs AI inference on a single issue and returns its estimate.
 * Shared by the issue-opened (issue.ts) and backfill (backfill.ts) entry points so the
 * prompt → inference → validation pipeline lives in a single place.
 */
const estimateIssue = async ({
  issue,
  instructions,
  samples,
  token,
}: {
  issue: IssueInput
  instructions: string
  samples: EstimateSample[]
  token: string
}): Promise<Estimate> => {
  const prompt = buildPrompt(samples, issue)
  const outputs = await inference({ token, prompt, instructions })
  const { estimate: category } = validateEstimate(outputs)
  return { category, hours: CATEGORY_TO_HOURS[category], seconds: categoryToSeconds(category) }
}

export default estimateIssue
