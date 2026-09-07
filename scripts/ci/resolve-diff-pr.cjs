/**
 * Resolves the PR number from the `pr-number` artifact uploaded by the Puppeteer workflow and
 * verifies it against the workflow_run head sha, so a crafted pr-number.txt cannot target another
 * PR.
 *
 * Loaded by the `Resolve and verify PR number` step of
 * .github/workflows/puppeteer-diff-comment.yml through actions/github-script. Sets the `number` and
 * `author` step outputs, or fails the step when the artifact is untrustworthy.
 */
const fs = require('node:fs')

const PR_NUMBER_FILE = 'artifacts/pr-number/pr-number.txt'

/** Resolves and verifies the PR the downloaded diff artifacts belong to. */
const resolveDiffPr = async ({ github, context, core }) => {
  if (!fs.existsSync(PR_NUMBER_FILE)) {
    core.info('No pr-number artifact found; nothing to do.')
    return
  }
  const raw = fs.readFileSync(PR_NUMBER_FILE, 'utf8').trim()
  if (!/^[0-9]+$/.test(raw)) {
    core.setFailed(`Refusing to proceed: pr-number artifact is not a plain integer (${JSON.stringify(raw)}).`)
    return
  }
  const prNumber = Number(raw)
  const headSha = context.payload.workflow_run.head_sha
  const { owner, repo } = context.repo
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber })
  // Anti-spoofing: the PR the images claim to belong to must be the one whose head commit actually
  // triggered the test run.
  if (pr.head.sha !== headSha) {
    core.setFailed(
      `Aborting: PR #${prNumber} head sha ${pr.head.sha} does not match the ` +
        `workflow_run head sha ${headSha}. This likely indicates a spoofed pr-number artifact.`,
    )
    return
  }
  core.setOutput('number', String(prNumber))
  core.setOutput('author', pr.user ? pr.user.login : '')
}

module.exports = resolveDiffPr
