/** Label applied to issues whose estimate the confidence gate flagged for human review. */
export const NEEDS_REVIEW_LABEL = 'estimate-needs-review'

/**
 * Adds the needs-review label to a GitHub issue. Best-effort: a failure is warned, not thrown, so a
 * labeling problem never discards an estimate that has already been written to Everhour. GitHub's
 * add-labels endpoint creates the label automatically if it does not yet exist in the repo.
 */
const flagForReview = async ({
  owner,
  repoName,
  issueNumber,
  githubToken,
  issueRef,
}: {
  owner: string
  repoName: string
  issueNumber: number
  githubToken: string
  /** Issue reference label used in warning output. */
  issueRef: string
}): Promise<void> => {
  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}/labels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ labels: [NEEDS_REVIEW_LABEL] }),
    })
    if (!resp.ok) {
      console.warn(`  Failed to add "${NEEDS_REVIEW_LABEL}" label to ${issueRef} - GitHub API error ${resp.status}`)
    }
  } catch (err) {
    console.warn(`  Failed to add "${NEEDS_REVIEW_LABEL}" label to ${issueRef}:`, err)
  }
}

export default flagForReview
