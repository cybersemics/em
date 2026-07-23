import type { EstimateSample } from './loadSamples.ts'

/** Issue data for estimation. */
export interface IssueInput {
  title: string
  body: string
  labels: string[]
}

/** Optional extras injected into the prompt. */
export interface BuildPromptOptions {
  /**
   * Compact distribution of the retrieved neighbors' estimates (e.g. `M×4, S×3, L×1`), surfaced to
   * the model as a prior showing how similar past issues were estimated. Omitted when retrieval was
   * unavailable.
   */
  neighborDistribution?: string
}

/** Builds the estimation prompt from sample data and the target issue. Instructions are passed separately as the system message. */
const buildPrompt = (samples: EstimateSample[], issue: IssueInput, options: BuildPromptOptions = {}): string => {
  let prompt = ''

  if (samples.length > 0) {
    prompt += '## Examples\n\n'
    for (const sample of samples) {
      prompt += `### Issue: ${sample.input.title}\n`
      prompt += `Labels: ${sample.input.labels.join(', ')}\n`
      prompt += `Body:\n${sample.input.body}\n`
      prompt += `Expected estimate: ${sample.expected}\n\n`
    }
  }

  // Surface how the most similar past issues were estimated, so the model sees the neighbor prior
  // before committing to a bucket. Placed after the examples and before the target issue.
  if (options.neighborDistribution) {
    prompt += '## Similar past issues\n\n'
    prompt += `Among the most similar past issues, estimates were: ${options.neighborDistribution}.\n\n`
  }

  prompt += '## Issue to Estimate\n\n'
  prompt += `Title: ${issue.title}\n`
  prompt += `Labels: ${issue.labels.join(', ')}\n`
  prompt += `Body:\n${issue.body}\n\n`
  prompt +=
    'Respond with only a JSON object with these fields, in this order: ' +
    '{"rationale": "<brief reasoning>", "estimate": "<CATEGORY>", "confidence": "high|medium|low", "secondChoice": "<CATEGORY>"}. ' +
    'Put "rationale" first so you reason before committing to a bucket.\n'

  return prompt
}

export default buildPrompt
