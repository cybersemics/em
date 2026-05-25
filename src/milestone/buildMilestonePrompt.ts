interface MilestoneMapping {
  id: string
  githubTitle: string
}

interface MilestoneSample {
  input: {
    title: string
    body: string
    labels: string[]
  }
  expected: {
    milestone: string
  }
}

/** Builds the prompt for milestone inference. */
const buildMilestonePrompt = ({
  instructions,
  milestoneMap,
  samples,
  issueTitle,
  issueBody,
  issueLabels,
}: {
  instructions: string
  milestoneMap: MilestoneMapping[]
  samples: MilestoneSample[]
  issueTitle: string
  issueBody: string
  issueLabels: string[]
}): string => {
  const milestoneList = milestoneMap
    .map(milestone => `- id: "${milestone.id}" (GitHub title: "${milestone.githubTitle}")`)
    .join('\n')

  const samplesText =
    samples.length > 0
      ? samples
          .map(
            sample =>
              `Input:\n  Title: ${sample.input.title}\n  Body: ${sample.input.body}\n  Labels: ${sample.input.labels.join(', ')}\nExpected milestone: ${sample.expected.milestone}`,
          )
          .join('\n\n')
      : 'No samples available.'

  return `${instructions}

## Available Milestones

${milestoneList}

## Examples

${samplesText}

## Issue to Classify

Title: ${issueTitle}
Body: ${issueBody}
Labels: ${issueLabels.join(', ')}

## Output

Return ONLY valid JSON:
{"milestone": "<id>", "confidence": "high|medium|low"}
`
}

export default buildMilestonePrompt
