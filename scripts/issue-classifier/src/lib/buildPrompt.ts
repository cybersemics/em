import type { Milestone } from './github.ts'

/** Issue data used to select a milestone. */
export interface IssueInput {
  title: string
  body: string
  labels: string[]
}

/**
 * Builds the selection prompt from the currently open milestones and the target issue. The
 * instructions — what each milestone means, how to break ties, the output contract — are passed
 * separately as the system message.
 *
 * The open milestones are injected here rather than written into the instructions so the model can
 * only ever choose from titles that exist right now. A milestone created or closed today is
 * reflected on the next run with no file to update.
 */
const buildPrompt = (milestones: Milestone[], issue: IssueInput): string => {
  let prompt = '## Open Milestones\n\n'
  prompt += 'Choose exactly one of these titles, copied verbatim, or null if none of them fits.\n'
  prompt += 'An indented line below a title is a description for context only. Never include it in your answer.\n\n'
  for (const milestone of milestones) {
    // The description goes on its own indented line rather than after a dash on the title line.
    // Joined onto one line, models copy the whole line back as the title, which then resolves to no
    // open milestone and throws the vote away.
    prompt += `- ${milestone.title}\n`
    if (milestone.description) prompt += `    ${milestone.description}\n`
  }

  prompt += '\n## Issue to Categorize\n\n'
  prompt += `Title: ${issue.title}\n`
  prompt += `Labels: ${issue.labels.join(', ')}\n`
  prompt += `Body:\n${issue.body}\n\n`
  prompt +=
    'Respond with only a JSON object with these fields, in this order: ' +
    '{"rationale": "<brief reasoning>", "milestone": "<TITLE or null>", "confidence": "low|medium|high", "secondChoice": "<TITLE or null>"}. ' +
    'Put "rationale" first so you reason before committing to a milestone.\n'

  return prompt
}

export default buildPrompt
