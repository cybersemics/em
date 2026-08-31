/**
 * Takes a finished Copilot pull request out of draft once every check on it has passed.
 *
 * Loaded by the `Mark ready for review` step of .github/workflows/pr-ready.yml through
 * actions/github-script. Reads HEAD_BRANCH (or PR_NUMBER on a manual dispatch) from the
 * environment.
 *
 * Copilot opens its pull requests as a draft and never takes them out of one: when a session ends
 * it requests a review and stops. Nothing else moves it either, so the pull request sits in draft
 * — invisible to reviewers, ineligible for auto-merge — until someone notices. Every non-draft
 * Copilot pull request in this repository was undrafted by hand. The instruction files are the
 * wrong place to fix that, because the agent's own token cannot be relied on to carry the
 * permission, and an instruction that silently fails is worse than none. The checks are a signal
 * this repository owns outright.
 *
 * The workflow fires on every check completion, so most calls here stop at one of the guards
 * below; only the run that sees the last check complete reaches the mutation. Being
 * `workflow_run`-triggered, this reports no check of its own to the head commit and so never waits
 * on itself.
 */

/**
 * The only pull request author this acts on. A human's draft is deliberate and must be left alone,
 * and the `copilot/` branch prefix alone is not proof of one. Note this is the REST `user.login`,
 * which is `Copilot` — `gh pr view` reports the same account as `app/copilot-swe-agent`.
 */
const COPILOT = 'Copilot'

/**
 * Conclusions that mean a check genuinely failed. `cancelled` is excluded because that is what
 * Cancel PR Runs does to a merged pull request's in-flight checks, and `skipped`, `neutral`, and
 * `stale` never indicate a broken build.
 */
const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required'])

/** The timeline events that bracket an agent session, newest of which says whether one is running. */
const WORK_EVENTS = new Set(['copilot_work_started', 'copilot_work_finished'])

/** Takes a finished Copilot pull request out of draft once its checks are green. */
const markCopilotPrReady = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
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
    core.info(`No open pull request for ${headBranch || `#${prNumber}`}; nothing to mark ready.`)
    return
  }
  if (!pr.draft) {
    core.info(`#${pr.number} is already ready for review.`)
    return
  }
  if (pr.user.login !== COPILOT || pr.user.type !== 'Bot') {
    core.info(`#${pr.number} is authored by ${pr.user.login}, not ${COPILOT}; leaving its draft status alone.`)
    return
  }

  // The agent pushes several commits over a session and each one runs the full suite, so green
  // checks alone would undraft a pull request the agent is still working on. `copilot_work_started`
  // and `copilot_work_finished` bracket each session: the newest of the two says whether one is
  // running right now, which a plain "has it ever finished" test would miss on a second session.
  const timeline = await github.paginate(github.rest.issues.listEventsForTimeline, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  })
  const work = timeline.filter(event => WORK_EVENTS.has(event.event))
  const latest = work[work.length - 1]
  if (!latest || latest.event !== 'copilot_work_finished') {
    core.info(`#${pr.number}: the agent is still working (${latest ? latest.event : 'no session recorded'}).`)
    return
  }

  const headSha = pr.head.sha

  // filter=latest collapses re-runs to the check that is actually reported on the pull request.
  const checkRuns = await github.paginate(github.rest.checks.listForRef, {
    owner,
    repo,
    ref: headSha,
    filter: 'latest',
    per_page: 100,
  })

  if (checkRuns.length === 0) {
    core.info(`#${pr.number}: no checks have reported on ${headSha.slice(0, 7)} yet.`)
    return
  }

  const pending = checkRuns.filter(check => check.status !== 'completed')
  if (pending.length > 0) {
    core.info(`#${pr.number}: still running — ${pending.map(check => check.name).join(', ')}. Not the last one out.`)
    return
  }

  const failed = checkRuns.filter(check => FAILED_CONCLUSIONS.has(check.conclusion))
  if (failed.length > 0) {
    core.info(
      `#${pr.number}: ${failed.map(check => check.name).join(', ')} failed on ${headSha.slice(0, 7)}. ` +
        'A draft is the correct state for a pull request whose checks are red.',
    )
    return
  }

  // No REST equivalent exists; this is the only way to undraft a pull request. It needs
  // `contents: write` as well as `pull-requests: write` — see cli/cli#6924.
  await github.graphql(
    `mutation ($id: ID!) {
      markPullRequestReadyForReview(input: { pullRequestId: $id }) {
        pullRequest {
          number
        }
      }
    }`,
    { id: pr.node_id },
  )

  core.info(`#${pr.number}: all ${checkRuns.length} checks passed on ${headSha.slice(0, 7)}; marked ready for review.`)
  core.summary.addRaw(`Marked [#${pr.number}](${pr.html_url}) ready for review — all checks green.`)
  await core.summary.write()
}

module.exports = markCopilotPrReady
