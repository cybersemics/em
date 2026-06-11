interface GitHubMilestone {
  number: number
  title: string
  state: string
}

/** Fetches the list of open milestones from GitHub. */
const listOpenMilestones = async (owner: string, repo: string, token: string): Promise<GitHubMilestone[]> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/milestones?state=open`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch milestones: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<GitHubMilestone[]>
}

export default listOpenMilestones
