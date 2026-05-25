interface MilestoneMapping {
  id: string
  githubTitle: string
}

interface GitHubMilestone {
  number: number
  title: string
  state: string
}

interface MilestoneSelection {
  milestone: string
  confidence: string
}

const VALID_CONFIDENCE_VALUES = ['low', 'medium', 'high']

/** Validates a milestone selection from the model. Returns an error message if invalid, null if valid. */
const validateMilestoneSelection = (
  selection: MilestoneSelection,
  milestoneMap: MilestoneMapping[],
  openMilestones: GitHubMilestone[],
): string | null => {
  if (!selection.milestone || typeof selection.milestone !== 'string') {
    return 'Missing or invalid milestone field'
  }

  if (!selection.confidence || !VALID_CONFIDENCE_VALUES.includes(selection.confidence)) {
    return `Invalid confidence value: ${selection.confidence}. Must be one of: ${VALID_CONFIDENCE_VALUES.join(', ')}`
  }

  const mapping = milestoneMap.find(milestone => milestone.id === selection.milestone)
  if (!mapping) {
    return `Unknown milestone id: ${selection.milestone}`
  }

  const githubMilestone = openMilestones.find(milestone => milestone.title === mapping.githubTitle)
  if (!githubMilestone) {
    return `Milestone "${selection.milestone}" (title: "${mapping.githubTitle}") does not resolve to an open GitHub milestone`
  }

  return null
}

export default validateMilestoneSelection
