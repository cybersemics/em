import { EstimateSample } from './loadSamples'

/** Issue data for estimation. */
export interface IssueInput {
  title: string
  body: string
  labels: string[]
}

/** Builds the full estimation prompt from instructions, sample data, and the target issue. */
const buildPrompt = (instructions: string, samples: EstimateSample[], issue: IssueInput): string => {
  let prompt = `${instructions}\n\n`

  if (samples.length > 0) {
    prompt += '## Examples\n\n'
    for (const sample of samples) {
      prompt += `### Issue: ${sample.input.title}\n`
      prompt += `Labels: ${sample.input.labels.join(', ')}\n`
      prompt += `Body:\n${sample.input.body}\n`
      prompt += `Expected estimate: ${sample.expected}\n\n`
    }
  }

  prompt += '## Issue to Estimate\n\n'
  prompt += `Title: ${issue.title}\n`
  prompt += `Labels: ${issue.labels.join(', ')}\n`
  prompt += `Body:\n${issue.body}\n\n`
  prompt += 'Respond with only a JSON object: {"estimate": "<CATEGORY>"}\n'

  return prompt
}

export default buildPrompt
