#!/usr/bin/env node
/**
 * Maintains a "Preview Deployment" comment on a pull request holding a QR code of its latest
 * successful Vercel preview. Run by .github/workflows/preview-qr.yml as
 * `node scripts/ci/preview-qr.mjs <head-sha>`, or with `--pr <number>` in place of the commit to
 * reconcile that pull request's current head, which is what the workflow's manual dispatch does.
 *
 * The workflow is a reconciler, not an event handler. Every invocation resolves the pull request
 * the commit belongs to, finds the newest Vercel Preview run for that pull request's *current*
 * head, and rewrites the comment to describe that run — whatever event happened to wake it. That
 * is what makes delivery order irrelevant: a late event for a superseded commit finds that the
 * head has moved and exits; a duplicate event renders an identical comment and skips the write.
 *
 * The QR lives in a comment of its own rather than in the description because the description has
 * other writers. The Copilot coding agent rewrites the whole description each time it reports
 * progress, without a push, so a QR kept there disappears until the next preview; nobody but this
 * script edits the comment. The comment is the one by github-actions[bot] containing
 * `<!-- preview-qr:start -->`, and an HTML comment `<!-- preview-qr:state {json} -->` inside it
 * carries the machine-readable state — the commit, timestamp, URL, and QR image of the latest
 * successful deployment, and the commit and timestamp of the deployment currently building — so a
 * failed build can restore the QR that stays on display without re-deriving it from the
 * deployments API. Everything in the comment is rendered from state on every write.
 *
 * State transitions, where A is the last successful preview and B the one being built.
 *
 * ```
 * no comment ── run starts ──▶ generating B (no QR) ── success ──▶ stable B
 *                                     └── failure ──▶ comment deleted
 * stable A ──── run starts ──▶ generating B (QR A)  ── success ──▶ stable B
 *                                     └── failure ──▶ stable A
 * ```
 *
 * The QR image is committed as `pr-<number>.png` to the `preview-qr` branch, which holds nothing
 * else and is written only by this script, and the comment links to it by commit SHA. A
 * commit-pinned URL is unique per upload, so GitHub's image proxy can never serve a previous QR
 * from its cache, and the branch keeps only the latest file per pull request. Every call uses
 * GH_TOKEN, the workflow's own token.
 *
 * Descriptions written before the QR moved to a comment still carry the old managed block between
 * the same markers; the next reconcile cuts it out, leaving the rest of the description as it was.
 *
 * SECURITY: this runs in the base repository with write access and is triggered by runs of fork
 * code. It never checks out or executes anything from the pull request. Every input is either
 * GitHub API metadata or a value the trusted Vercel Preview workflow wrote to the deployment
 * record (the preview URL), and the preview URL is only ever encoded into a PNG and placed in a
 * link. Only a comment authored by github-actions[bot] is ever read as state, so a marker pasted
 * into another comment cannot steer it.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Opens the managed block. Must stay in sync with the workflow's documentation. */
export const START = '<!-- preview-qr:start -->'

/** Closes the managed block. */
export const END = '<!-- preview-qr:end -->'

/** The workflow file whose runs are the preview deployments. */
const PREVIEW_WORKFLOW = '.github/workflows/vercel-preview.yml'

/** The environment name vercel-preview.yml deploys to. */
const PREVIEW_ENVIRONMENT = 'Preview'

/** The branch the QR images are committed to. */
const BRANCH = 'preview-qr'

/** The author of every comment the workflow token writes. */
const BOT = 'github-actions[bot]'

/**
 * Formats a deployment timestamp for the disclosure summary in UTC, as `Sep 4, 2026, 10:00 AM UTC`.
 * UTC so two runs never disagree about the moment of one deployment.
 */
export const formatTimestamp = iso =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(iso))

/**
 * Splits a body into the text outside the managed block and the block's parsed state. Outside
 * text is returned with the block cut out and trailing whitespace trimmed. Used on the comment,
 * where only the state matters, and on a description that still carries a block from before the
 * QR moved to a comment, where only the outside text does.
 */
export const parseBody = body => {
  const text = body ?? ''
  const start = text.indexOf(START)
  const end = text.indexOf(END, start + START.length)
  if (start === -1 || end === -1) return { outside: text.trimEnd(), state: null }
  const block = text.slice(start, end + END.length)
  const outside = (text.slice(0, start) + text.slice(end + END.length)).trimEnd()
  const match = block.match(/<!-- preview-qr:state (\{.*?\}) -->/s)
  if (!match) return { outside, state: null }
  try {
    const { stable, pending } = JSON.parse(match[1])
    // A block written before the image URL moved into the state has none, and gets a new upload.
    return { outside, state: { stable: stable ? { image: null, ...stable } : null, pending: pending ?? null } }
  } catch {
    return { outside, state: null }
  }
}

/**
 * Renders the comment from state, or null when there is nothing to show — no successful preview
 * and none building.
 *
 * The blank lines around the image are load-bearing: GitHub only renders markdown inside a
 * `<details>` HTML block when a blank line ends the block's raw-HTML run.
 *
 * The link around the image is a raw `<a>` rather than a markdown link so it can ask for a new tab.
 * The tag opens a paragraph rather than an HTML block because it is not alone on its line, so the
 * image is still parsed as markdown. GitHub may strip `target`, in which case this degrades to an
 * ordinary link.
 */
export const renderBlock = ({ stable, pending }) => {
  if (!stable && !pending) return null
  const summary = pending
    ? `Preview Deployment · Generating new QR code… · ${formatTimestamp(pending.createdAt)} · ${pending.sha.slice(0, 7)}`
    : `Preview Deployment · ${formatTimestamp(stable.createdAt)} · ${stable.sha.slice(0, 7)}`
  const content = stable
    ? [`<a href="${stable.url}" target="_blank" rel="noopener noreferrer">![Preview deployment](${stable.image})</a>`]
    : ['Preview deployment is being generated.']
  const state = {
    stable: stable ? { sha: stable.sha, createdAt: stable.createdAt, url: stable.url, image: stable.image } : null,
    pending: pending ? { sha: pending.sha, createdAt: pending.createdAt } : null,
  }
  return [
    START,
    `<!-- preview-qr:state ${JSON.stringify(state)} -->`,
    '<details>',
    `<summary>${summary}</summary>`,
    '',
    ...content,
    '',
    '</details>',
    END,
  ].join('\n')
}

/**
 * Decides the state the comment should be in for the newest preview run. `run` is that run's
 * current status and conclusion, `deployment` the deployment it created (if any, with `url` once
 * it succeeded), and `current` the state parsed from the comment. Returns the target state, or
 * `null` to leave the comment alone because the run has not started yet. A target whose stable
 * preview has no image is one whose QR still has to be generated and committed.
 */
export const decide = ({ run, deployment, current }) => {
  const stable = current?.stable ?? null
  if (run.status !== 'completed') {
    // The deployment record appears a minute into the run, so the first event sees only the run's
    // start time. Keep whichever timestamp was already shown rather than rewriting the block for a
    // few seconds' difference; the successful state takes its date from the deployment itself.
    const pending = current?.pending?.sha === run.headSha ? current.pending : null
    return run.status === 'in_progress'
      ? { stable, pending: pending ?? { sha: run.headSha, createdAt: deployment?.createdAt ?? run.startedAt } }
      : null
  }
  if (run.conclusion !== 'success' || !deployment?.url) return { stable, pending: null }
  // The same URL is the same deployment delivered twice: keep its QR rather than uploading again.
  return stable?.url === deployment.url
    ? { stable, pending: null }
    : { stable: { sha: run.headSha, createdAt: deployment.createdAt, url: deployment.url, image: null }, pending: null }
}

/**
 * Calls the GitHub REST API with the workflow token and returns the parsed JSON, or null for an
 * empty response. A failure throws an error carrying the HTTP `status`. GITHUB_API_URL is what
 * Actions sets it to; overriding it points the script at a stand-in server for a dry run.
 */
const api = async (route, init = {}) => {
  const response = await fetch(`${process.env.GITHUB_API_URL ?? 'https://api.github.com'}${route}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  })
  if (!response.ok) {
    const message = `${init.method ?? 'GET'} ${route} → ${response.status} ${await response.text()}`
    throw Object.assign(new Error(message), { status: response.status })
  }
  return response.status === 204 ? null : response.json()
}

/**
 * Picks, from the open pull requests a commit belongs to, the one the commit was deployed for: the
 * pull request whose current head *is* the commit. A stacked pull request based on another's
 * branch also contains every commit of its base, so containment alone is ambiguous; head identity
 * is not. Returns null when no candidate's head is the commit — every one of them has moved on —
 * and throws only if two pull requests share the commit as their head, which would need two
 * branches pointing at one commit.
 */
export const selectPullRequest = (candidates, sha) => {
  const heads = candidates.filter(pr => pr.head.sha === sha)
  if (heads.length > 1) {
    throw new Error(`Commit ${sha} is the head of ${heads.length} open pull requests; refusing to pick one.`)
  }
  return heads[0] ?? null
}

/**
 * Resolves the open pull request in this repository whose head is the commit. Fork branch names
 * are not unique, so association is by commit identity; a later push makes the run stale, so
 * a pull request that has moved past the commit is reported and skipped.
 */
const resolvePullRequest = async (repo, sha) => {
  const pulls = await api(`/repos/${repo}/commits/${sha}/pulls?per_page=100`)
  const candidates = pulls.filter(pr => pr.state === 'open' && pr.base.repo.full_name === repo)
  // Re-fetch rather than trusting the association listing, which can lag behind a push.
  const current = await Promise.all(candidates.map(pr => api(`/repos/${repo}/pulls/${pr.number}`)))
  const pr = selectPullRequest(current, sha)
  if (!pr) {
    for (const stale of current) {
      console.info(`PR #${stale.number} has moved on to ${stale.head.sha}; ignoring stale event for ${sha}.`)
    }
  }
  return pr
}

/**
 * The newest Vercel Preview run for the commit, in the shape `decide` expects. Two runs can exist
 * for one commit (a reopen or a re-run); the newest by id is the one whose outcome counts.
 */
const newestPreviewRun = async (repo, sha) => {
  const { workflow_runs: runs } = await api(`/repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`)
  const run = runs
    .filter(r => r.path === PREVIEW_WORKFLOW && r.event === 'pull_request_target')
    .sort((a, b) => b.id - a.id)[0]
  return run
    ? { id: run.id, status: run.status, conclusion: run.conclusion, headSha: sha, startedAt: run.run_started_at }
    : null
}

/**
 * The Preview deployment the run created, with its URL once the run's success status carries one.
 * Matched through the status `log_url`, which vercel-preview.yml points at its own run.
 */
const deploymentForRun = async (repo, sha, runId) => {
  const deployments = await api(
    `/repos/${repo}/deployments?sha=${sha}&environment=${encodeURIComponent(PREVIEW_ENVIRONMENT)}&per_page=100`,
  )
  const suffix = `/actions/runs/${runId}`
  for (const deployment of deployments) {
    const statuses = await api(`/repos/${repo}/deployments/${deployment.id}/statuses?per_page=100`)
    if (!statuses.some(status => (status.log_url ?? '').endsWith(suffix))) continue
    const success = statuses.find(status => status.state === 'success' && status.environment_url)
    return { createdAt: deployment.created_at, url: success?.environment_url ?? null }
  }
  return null
}

/** Lists every comment on the pull request, following pagination. */
const listComments = async (repo, number, page = 1) => {
  const comments = await api(`/repos/${repo}/issues/${number}/comments?per_page=100&page=${page}`)
  return comments.length < 100 ? comments : [...comments, ...(await listComments(repo, number, page + 1))]
}

/**
 * Commits one file to the QR branch, creating the branch as an orphan on first use, and returns
 * the new commit's SHA. Workflow runs for different pull requests can race on the branch, so a
 * rejected ref update — another run moved the branch first — rebuilds the commit on the new head.
 */
const commitFile = async ({ repo, file, blob, message }, attempt = 1) => {
  const ref = await api(`/repos/${repo}/git/ref/heads/${BRANCH}`).catch(error =>
    error.status === 404 ? null : Promise.reject(error),
  )
  const parent = ref?.object.sha
  const baseTree = parent ? (await api(`/repos/${repo}/git/commits/${parent}`)).tree.sha : undefined
  const tree = await api(`/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTree, tree: [{ path: file, mode: '100644', type: 'blob', sha: blob }] }),
  })
  const commit = await api(`/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: parent ? [parent] : [] }),
  })
  try {
    await (parent
      ? api(`/repos/${repo}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) })
      : api(`/repos/${repo}/git/refs`, {
          method: 'POST',
          body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }),
        }))
    return commit.sha
  } catch (error) {
    if (error.status !== 422 || attempt >= 5) throw error
    console.info(`The ${BRANCH} branch moved during the commit; retrying (attempt ${attempt + 1}).`)
    return commitFile({ repo, file, blob, message }, attempt + 1)
  }
}

/**
 * Generates the QR PNG for the preview URL, commits it to the QR branch, and returns the image URL
 * pinned to that commit.
 */
const publishQr = async ({ repo, number, sha, url }) => {
  const png = path.join(mkdtempSync(path.join(process.env.RUNNER_TEMP ?? tmpdir(), 'preview-qr-')), 'qr.png')
  // -s 8: 8px modules, comfortably scannable from a monitor. -m 2: two-module quiet zone.
  // -l M: medium error correction, so a slightly blurred phone camera still reads it.
  execFileSync('qrencode', ['-o', png, '-s', '8', '-m', '2', '-l', 'M', url], { stdio: 'inherit' })
  const blob = await api(`/repos/${repo}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: readFileSync(png).toString('base64'), encoding: 'base64' }),
  })
  const file = `pr-${number}.png`
  const commit = await commitFile({ repo, file, blob: blob.sha, message: `PR #${number}: ${sha.slice(0, 7)}` })
  return `https://raw.githubusercontent.com/${repo}/${commit}/${file}`
}

/** Reconciles the preview comment of the pull request the commit belongs to. */
const main = async sha => {
  const repo = process.env.GITHUB_REPOSITORY
  const pr = await resolvePullRequest(repo, sha)
  if (!pr) {
    console.info(`No open pull request in ${repo} has ${sha} as its head; nothing to do.`)
    return
  }
  const run = await newestPreviewRun(repo, sha)
  if (!run) {
    console.info(`No Vercel Preview run for ${sha}; nothing to do.`)
    return
  }
  const deployment = await deploymentForRun(repo, sha, run.id)
  // Only the bot's own comment is state; anyone can paste the marker into a comment of theirs.
  const comment =
    (await listComments(repo, pr.number)).find(c => c.user?.login === BOT && (c.body ?? '').includes(START)) ?? null
  const target = decide({ run, deployment, current: parseBody(comment?.body).state })
  if (!target) {
    console.info(`Vercel Preview run ${run.id} is ${run.status}; leaving PR #${pr.number} as it is.`)
    return
  }
  if (run.status === 'completed' && run.conclusion === 'success' && !deployment?.url) {
    console.warn(`Run ${run.id} succeeded but recorded no preview URL; restoring the previous preview.`)
  }

  // Freshness check as close to the writes as possible: a push during the API calls above makes
  // this run stale.
  const latest = await api(`/repos/${repo}/pulls/${pr.number}`)
  if (latest.state !== 'open' || latest.head.sha !== sha) {
    console.info(`PR #${pr.number} changed under us (state ${latest.state}, head ${latest.head.sha}); not writing.`)
    return
  }

  if ((latest.body ?? '').includes(START)) {
    await api(`/repos/${repo}/pulls/${pr.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: parseBody(latest.body).outside }),
    })
    console.info(`PR #${pr.number}: removed the old preview block from the description.`)
  }

  const stable =
    target.stable && !target.stable.image
      ? { ...target.stable, image: await publishQr({ repo, number: pr.number, sha, url: target.stable.url }) }
      : target.stable
  const block = renderBlock({ ...target, stable })
  if (block === (comment?.body ?? null)) {
    console.info(`PR #${pr.number} already reflects run ${run.id}; nothing to write.`)
    return
  }

  await (!block
    ? api(`/repos/${repo}/issues/comments/${comment.id}`, { method: 'DELETE' })
    : comment
      ? api(`/repos/${repo}/issues/comments/${comment.id}`, { method: 'PATCH', body: JSON.stringify({ body: block }) })
      : api(`/repos/${repo}/issues/${pr.number}/comments`, { method: 'POST', body: JSON.stringify({ body: block }) }))
  const outcome = target.pending
    ? `generating ${target.pending.sha.slice(0, 7)}`
    : stable
      ? `stable ${stable.sha.slice(0, 7)}, QR ${stable.image}`
      : 'comment deleted'
  console.info(`PR #${pr.number}: ${outcome}.`)
}

export default main

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [first, second] = process.argv.slice(2)
  const sha =
    first === '--pr' && /^[0-9]+$/.test(second ?? '')
      ? (await api(`/repos/${process.env.GITHUB_REPOSITORY}/pulls/${second}`)).head.sha
      : first
  if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
    console.error('usage: node scripts/ci/preview-qr.mjs <head-sha> | --pr <number>')
    process.exit(2)
  }
  await main(sha)
}
