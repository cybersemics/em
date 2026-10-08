/**
 * Decides whether a Dependabot pull request is ready to merge: every check on its head has finished
 * and none of them failed.
 *
 * Loaded by the `Check pull request` step of .github/workflows/dependabot-automerge.yml through
 * actions/github-script. Reads HEAD_BRANCH (or PR_NUMBER on a manual dispatch) from the
 * environment, and sets the `merge`, `pr`, and `sha` outputs that the merge step acts on.
 *
 * Native auto-merge is the wrong tool here. It waits only for *required* status checks, and Lint is
 * the only one — Test, Puppeteer, BrowserStack, and Vercel Preview are deliberately left optional,
 * since a path-filtered workflow reports no check at all on a pull request it skips. Armed on a
 * bump, `gh pr merge --auto` therefore landed it the moment Lint went green with every slower suite
 * still running, and Cancel PR Runs then cancelled those. #5775 merged at 02:53 with Test, Puppeteer, and BrowserStack all
 * in flight; #5560 merged twenty seconds after Lint with Deploy Preview already red.
 *
 * The workflow fires on every check completion, so most calls here stop at one of the guards
 * below; only the run that sees the last check complete reaches `merge=true`. Being
 * `workflow_run`-triggered, this reports no check of its own to the head commit and so never waits
 * on itself.
 */

/**
 * The only pull request author this acts on. The `dependabot/` branch prefix alone is not proof of
 * one: a collaborator can push a branch with that name.
 */
const DEPENDABOT = 'dependabot[bot]'

/**
 * Conclusions that count as a pass. `skipped` is a job whose `if` declined to run — the TDD jobs on
 * a bump with no new tests, the Copilot conflict scan on a pull request that is not Copilot's.
 * Everything else blocks, `cancelled` included: a cancelled check on the head commit is a suite that
 * never finished, which is exactly what this exists to wait for.
 */
const PASSING_CONCLUSIONS = new Set(['success', 'skipped', 'neutral'])

/** Formats a list of check names for a log line. */
const names = checks => checks.map(check => check.name).join(', ')

/**
 * Pure verdict over the head commit's checks. Returns `{ ready: true }` or `{ ready: false, reason }`.
 * Exported for the tests.
 */
const evaluateChecks = ({ workflowRuns, checkRuns, statuses }) => {
  // A workflow run that is still queued may not have created its check runs yet, so the check runs
  // alone cannot prove the suite is done. The run list can.
  const runningWorkflows = workflowRuns.filter(run => run.status !== 'completed')
  if (runningWorkflows.length > 0) {
    return { ready: false, reason: `still running — ${names(runningWorkflows)}` }
  }

  if (checkRuns.length === 0) {
    return { ready: false, reason: 'no checks have reported yet' }
  }

  const pending = checkRuns.filter(check => check.status !== 'completed')
  if (pending.length > 0) {
    return { ready: false, reason: `still running — ${names(pending)}` }
  }

  const blocking = checkRuns.filter(check => !PASSING_CONCLUSIONS.has(check.conclusion))
  if (blocking.length > 0) {
    return {
      ready: false,
      reason: `not passing — ${blocking.map(check => `${check.name} (${check.conclusion})`).join(', ')}`,
    }
  }

  // Commit statuses are the older API that external services report through. None report here
  // today; this keeps one that is added later from being merged past.
  const unsettled = statuses.filter(status => status.state !== 'success')
  if (unsettled.length > 0) {
    return {
      ready: false,
      reason: `status not passing — ${unsettled.map(status => `${status.context} (${status.state})`).join(', ')}`,
    }
  }

  return { ready: true }
}

/** Approves and flags a Dependabot pull request for merging once every check on its head has passed. */
const mergeDependabotPr = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  core.setOutput('merge', 'false')

  // A manual dispatch names the pull request; the automatic trigger names its branch. Neither is
  // taken on trust: the pulls API silently ignores an *empty* `head` filter and answers with the
  // newest open pull request rather than with none, so an unusable input would otherwise aim this
  // at whichever pull request happened to be last.
  const rawNumber = (process.env.PR_NUMBER || '').trim()
  const headBranch = (process.env.HEAD_BRANCH || '').trim()
  if (rawNumber && !/^[0-9]+$/.test(rawNumber)) {
    core.setFailed(`Refusing to proceed: pr is not a plain integer (${JSON.stringify(rawNumber)}).`)
    return
  }
  if (!rawNumber && !headBranch) {
    core.setFailed('Refusing to proceed: neither a pull request number nor a head branch was given.')
    return
  }
  const prNumber = Number(rawNumber || '0')

  // Resolved from the branch rather than from workflow_run.pull_requests, which is empty whenever
  // the triggering run's head commit is no longer the head of an open pull request.
  let pr
  if (prNumber) {
    pr = (await github.rest.pulls.get({ owner, repo, pull_number: prNumber })).data
  } else {
    const { data: matches } = await github.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${headBranch}`,
      state: 'open',
      per_page: 1,
    })
    pr = matches[0]
  }

  if (!pr || pr.state !== 'open') {
    core.info(`No open pull request for ${headBranch || `#${prNumber}`}; nothing to merge.`)
    return
  }
  // Gated on the pull request's author, not on who last pushed: a bump that needed fixing carries a
  // commit from Dependabot Fix's agent or a human, and landing that is the point of the fix.
  if (pr.user.login !== DEPENDABOT) {
    core.info(`#${pr.number} is authored by ${pr.user.login}, not ${DEPENDABOT}; leaving it alone.`)
    return
  }
  if (pr.head.repo?.full_name !== `${owner}/${repo}` || !pr.head.ref.startsWith('dependabot/')) {
    core.info(`#${pr.number}: head ${pr.head.label} is not a dependabot/ branch in this repository.`)
    return
  }
  if (pr.draft) {
    core.info(`#${pr.number} is a draft.`)
    return
  }
  // A conflicting pull request has no merge ref, so the `pull_request` checks never ran on it and
  // the ones that did (the `pull_request_target` ones) can look complete and green. `null` means
  // GitHub is still computing it; the merge itself refuses a conflict, so that case may proceed.
  if (pr.mergeable === false) {
    core.info(`#${pr.number} conflicts with ${pr.base.ref}; waiting for the push that resolves it.`)
    return
  }

  const headSha = pr.head.sha
  const [workflowRuns, checkRuns, combined] = await Promise.all([
    github.paginate(github.rest.actions.listWorkflowRunsForRepo, { owner, repo, head_sha: headSha, per_page: 100 }),
    // filter=latest collapses re-runs to the check that is actually reported on the pull request.
    github.paginate(github.rest.checks.listForRef, { owner, repo, ref: headSha, filter: 'latest', per_page: 100 }),
    github.rest.repos.getCombinedStatusForRef({ owner, repo, ref: headSha, per_page: 100 }),
  ])

  const verdict = evaluateChecks({
    // Another repository's run on the same SHA, if one exists, is not this pull request's CI.
    workflowRuns: workflowRuns.filter(run => run.head_repository?.full_name === `${owner}/${repo}`),
    checkRuns,
    statuses: combined.data.statuses,
  })
  if (!verdict.ready) {
    core.info(`#${pr.number} on ${headSha.slice(0, 7)}: ${verdict.reason}.`)
    return
  }

  // Only when every commit is Dependabot's. `main` requires 0 approving reviews, so this satisfies
  // no gate today and skipping it costs nothing. If that count is ever raised, an approval stamped
  // on a commit an agent or a human wrote would be automation standing in for the review of
  // hand-written code; withholding it leaves the merge below to fail and wait for a human, which is
  // the right way for this to fail.
  const commits = await github.paginate(github.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  })
  if (commits.every(commit => commit.author?.login === DEPENDABOT)) {
    // Best effort: a refused approval satisfies no gate, so it must not hold up the merge.
    try {
      await github.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pr.number,
        commit_id: headSha,
        event: 'APPROVE',
      })
    } catch (error) {
      core.warning(`#${pr.number}: approval failed (${error.message}); merging anyway.`)
    }
  } else {
    core.info(`#${pr.number} carries commits not written by ${DEPENDABOT}; not approving.`)
  }

  core.info(`#${pr.number}: all ${checkRuns.length} checks passed on ${headSha.slice(0, 7)}; merging.`)
  core.setOutput('merge', 'true')
  core.setOutput('pr', String(pr.number))
  core.setOutput('sha', headSha)
}

module.exports = mergeDependabotPr
module.exports.evaluateChecks = evaluateChecks
