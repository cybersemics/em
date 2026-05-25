import assignIssueMilestone from '../src/milestone/assignIssueMilestone.js'

/** Entry point for the milestone assignment workflow. */
const main = async () => {
  const issueNumber = parseInt(process.env.ISSUE_NUMBER || '', 10)
  const issueTitle = process.env.ISSUE_TITLE || ''
  const issueBody = process.env.ISSUE_BODY || ''
  const issueLabels = (process.env.ISSUE_LABELS || '').split(',').filter(Boolean)
  const issueMilestone = process.env.ISSUE_MILESTONE || ''
  const token = process.env.GITHUB_TOKEN || ''
  const owner = process.env.REPO_OWNER || ''
  const repo = process.env.REPO_NAME || ''

  if (!issueNumber || !token || !owner || !repo) {
    console.error('Missing required environment variables.')
    process.exit(1)
  }

  await assignIssueMilestone({
    issueNumber,
    issueTitle,
    issueBody,
    issueLabels,
    issueMilestone,
    token,
    owner,
    repo,
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
