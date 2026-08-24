import buildPrompt, { type IssueInput } from './buildPrompt.ts'
import gate, { DEFAULT_GATE_THRESHOLDS, type GateResult, type GateThresholds } from './gate.ts'
import type { Milestone } from './github.ts'
import inference, { type InferenceOptions } from './inference.ts'
import tallyVotes, { type VoteResult } from './tallyVotes.ts'

const MAX_INFERENCE_ATTEMPTS = 3
/**
 * Base delay between inference attempts, multiplied by the attempt number.
 *
 * Retrying without a pause is barely retrying at all: three attempts fire within milliseconds, so a
 * network blip lasting a second exhausts them and fails the run for a fault that would have cleared
 * on its own. This was observed emptying a 109-sample evaluation after 22 samples.
 */
const RETRY_DELAY_MS = 1000

/** A tallied vote plus the gate's decision about whether it may be assigned automatically. */
export type Selection = VoteResult & GateResult

/** Options for selecting a milestone. */
export interface SelectMilestoneOptions {
  issue: IssueInput
  /** The currently open milestones. The selection is always one of these, or null. */
  milestones: Milestone[]
  instructions: string
  openaiApiKey: string
  thresholds?: GateThresholds
  /** Inference implementation, injectable so callers can exercise the pipeline without network access. */
  infer?: (options: InferenceOptions) => Promise<string[]>
  /** Base delay between retries. Tests pass 0 so they do not spend the real backoff. */
  retryDelayMs?: number
}

/**
 * Runs the selection pipeline for one issue: prompt → inference → vote tally → assignment gate.
 *
 * Pure with respect to GitHub — it neither reads nor writes issue state — so the workflow entry
 * point and the evaluation harness share exactly the same decision path, and the harness measures
 * what production actually does rather than an approximation of it.
 *
 * An attempt is retried only when *every* vote in it was unusable, which is the model failing to
 * answer at all. A tally that lands on "no milestone fits" is a real answer and is returned, not
 * retried. Throws after MAX_INFERENCE_ATTEMPTS, since at that point inference is broken rather than
 * uncertain, and the caller should fail loudly instead of quietly assigning nothing.
 */
const selectMilestone = async ({
  issue,
  milestones,
  instructions,
  openaiApiKey,
  thresholds = DEFAULT_GATE_THRESHOLDS,
  infer = inference,
  retryDelayMs = RETRY_DELAY_MS,
}: SelectMilestoneOptions): Promise<Selection> => {
  const prompt = buildPrompt(milestones, issue)
  const titles = milestones.map(milestone => milestone.title)

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_INFERENCE_ATTEMPTS; attempt++) {
    try {
      const outputs = await infer({ apiKey: openaiApiKey, prompt, instructions })
      const vote = tallyVotes(outputs, titles)
      if (vote) return { ...vote, ...gate(vote, thresholds) }
      lastError = new Error(`No usable vote in ${outputs.length} samples: ${JSON.stringify(outputs)}`)
    } catch (error) {
      lastError = error as Error
    }
    console.warn(`Milestone inference attempt ${attempt}/${MAX_INFERENCE_ATTEMPTS} failed: ${lastError.message}`)
    if (attempt < MAX_INFERENCE_ATTEMPTS && retryDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
    }
  }

  throw new Error(`Milestone inference failed after ${MAX_INFERENCE_ATTEMPTS} attempts: ${lastError!.message}`)
}

export default selectMilestone
