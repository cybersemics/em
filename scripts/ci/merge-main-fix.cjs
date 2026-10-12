/**
 * Merges a Copilot pull request that fixes CI on `main`, once the agent has finished and every
 * check on it has completed and passed.
 *
 * Loaded by the `Merge main fix` step of .github/workflows/pr-ready.yml through
 * actions/github-script, and only after mark-copilot-pr-ready.cjs has found the pull request
 * finished and green. Reads PR_NUMBER and HEAD_SHA — the pull request and the commit that verdict
 * was reached on — and UNDRAFTED, `true` when that step has just taken it out of draft, from the
 * environment.
 *
 * A pull request is a fix for `main` when its description begins with `Fixes #<issue>` and that
 * issue is open and carries the `main-fix` label, which is what the task started by
 * start-main-fix-task.mjs is told to write. Every other Copilot pull request is left for a human.
 *
 * Why not auto-merge. Auto-merge waits only on the checks branch protection requires, and most of
 * this repository's checks are not required — a path-filtered workflow reports no check at all on
 * a pull request it skips, so making one required would block every such pull request. A fix that
 * lands with Puppeteer still running is how `main` breaks twice. So this checks every check run
 * and every commit status on the head commit itself, and merges only when none is pending and none
 * failed.
 *
 * Runs on a personal access token, not GITHUB_TOKEN: a push made with GITHUB_TOKEN starts no
 * workflow, so a merge made with it would run no CI on `main` — leaving nothing to confirm the fix
 * worked — and would not deploy it.
 */

/**
 * Check-run conclusions a merge may go ahead on. Stricter than the failure set the undraft step
 * uses: `cancelled` and `stale` say a check did not finish its job, which is not the same as passing.
 */
const PASSED_CONCLUSIONS = new Set(['success', 'skipped', 'neutral'])

/**
 * How long to wait before reading the checks on a pull request that was taken out of draft moments
 * ago. Nothing in this repository starts a check on `ready_for_review`, but a GitHub App can, and
 * its check does not exist until it has seen the event — reading at once would merge past it.
 */
const UNDRAFT_SETTLE_MS = 2 * 60 * 1000

/** The tracking issue's label. Must match LABEL in scripts/ci/collect-main-failures.cjs. */
const LABEL = 'main-fix'

/** The line the task is told to begin the description with. */
const FIXES = /^\s*Fixes #(\d+)\b/

/** Merges a finished, green Copilot pull request whose description says it fixes `main`. */
const mergeMainFix = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  const prNumber = Number(process.env.PR_NUMBER || '0')
  const headSha = (process.env.HEAD_SHA || '').trim()
  if (!prNumber || !headSha) {
    core.setFailed('Refusing to proceed: no pull request number or head SHA was given.')
    return
  }

  if (process.env.UNDRAFTED === 'true') await new Promise(resolve => setTimeout(resolve, UNDRAFT_SETTLE_MS))

  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber })
  if (pr.state !== 'open' || pr.draft) {
    core.info(`#${pr.number} is ${pr.state === 'open' ? 'a draft' : pr.state}; not merging.`)
    return
  }
  if (pr.base.ref !== 'main') {
    core.info(`#${pr.number} targets ${pr.base.ref}, not main; not merging.`)
    return
  }
  // The undraft step judged this commit. A push since then is a commit nobody has checked yet, and
  // its own checks will bring this back round.
  if (pr.head.sha !== headSha) {
    core.info(`#${pr.number} moved to ${pr.head.sha.slice(0, 7)} since its checks were read; not merging.`)
    return
  }

  const issueNumber = Number((FIXES.exec(pr.body || '') || [])[1] || '0')
  if (!issueNumber) {
    core.info(`#${pr.number} does not begin with "Fixes #<issue>"; not a fix for main.`)
    return
  }
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number: issueNumber })
  if (issue.state !== 'open' || !issue.labels.some(label => (label.name || label) === LABEL)) {
    core.info(`#${pr.number} fixes #${issueNumber}, which is not an open ${LABEL} issue; not merging.`)
    return
  }

  // Re-read rather than trusted from the undraft step, which counts a cancelled check as passing.
  const checkRuns = await github.paginate(github.rest.checks.listForRef, {
    owner,
    repo,
    ref: headSha,
    filter: 'latest',
    per_page: 100,
  })
  const unfinished = checkRuns.filter(
    check => check.status !== 'completed' || !PASSED_CONCLUSIONS.has(check.conclusion),
  )
  if (unfinished.length > 0) {
    core.info(
      `#${pr.number}: not every check has passed — ` +
        `${unfinished.map(check => `${check.name} (${check.conclusion || check.status})`).join(', ')}.`,
    )
    return
  }

  // Commit statuses are a separate API from check runs, and some integrations report only there.
  // The combined state reads `pending` when there are no statuses at all, so it is judged per status.
  const { data: combined } = await github.rest.repos.getCombinedStatusForRef({ owner, repo, ref: headSha })
  const notPassed = combined.statuses.filter(status => status.state !== 'success')
  if (notPassed.length > 0) {
    core.info(
      `#${pr.number}: not every status has passed — ` +
        `${notPassed.map(status => `${status.context} (${status.state})`).join(', ')}.`,
    )
    return
  }

  // `sha` makes GitHub refuse the merge if the head moved after the reads above.
  await github.rest.pulls.merge({ owner, repo, pull_number: pr.number, sha: headSha, merge_method: 'squash' })

  core.info(`#${pr.number}: merged — fixes #${issueNumber}, and all ${checkRuns.length} checks passed.`)
  core.summary.addRaw(`Merged [#${pr.number}](${pr.html_url}), which fixes #${issueNumber} on main.`)
  await core.summary.write()
}

module.exports = mergeMainFix
