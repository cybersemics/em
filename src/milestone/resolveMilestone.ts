interface MilestoneMapping {
  id: string
  githubTitle: string
}

interface GitHubMilestone {
  number: number
  title: string
  state: string
}

/** Resolves a stable milestone ID to its GitHub milestone number. Returns null if not found. */
const resolveMilestone = (
  milestoneId: string,
  milestoneMap: MilestoneMapping[],
  openMilestones: GitHubMilestone[],
): number | null => {
  const mapping = milestoneMap.find(milestone => milestone.id === milestoneId)
  if (!mapping) return null

  const githubMilestone = openMilestones.find(milestone => milestone.title === mapping.githubTitle)
  if (!githubMilestone) return null

  return githubMilestone.number
}

export default resolveMilestone
