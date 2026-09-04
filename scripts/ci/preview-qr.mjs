#!/usr/bin/env node
/**
 * Maintains a collapsed "Preview" disclosure at the bottom of a pull request description holding a
 * QR code of its latest successful Vercel preview. Run by .github/workflows/preview-qr.yml as
 * `node scripts/ci/preview-qr.mjs <head-sha>`, or with `--pr <number>` in place of the commit to
 * reconcile that pull request's current head, which is what the workflow's manual dispatch does.
 *
 * The workflow is a reconciler, not an event handler. Every invocation resolves the pull request
 * the commit belongs to, finds the newest Vercel Preview run for that pull request's *current*
 * head, and rewrites the managed block to describe that run — whatever event happened to wake it.
 * That is what makes delivery order irrelevant: a late event for a superseded commit finds that the
 * head has moved and exits; a duplicate event renders an identical body and skips the write.
 *
 * The block is the text between `<!-- preview-qr:start -->` and `<!-- preview-qr:end -->`. Inside
 * it, an HTML comment `<!-- preview-qr:state {json} -->` carries the machine-readable state — the
 * commit, timestamp, and URL of the latest successful deployment, and of the deployment currently
 * building — so a failed build can restore the summary of the QR that stays on display without
 * re-deriving it from the deployments API. The QR image URL is deliberately not in that comment:
 * `gh pr edit --attach` rewrites the markdown image reference to the uploaded asset but leaves
 * HTML comments alone, so the image is read back from the rendered markdown instead. Everything in
 * the block is rendered from state on every write; nothing outside the markers is ever touched.
 *
 * State transitions, where A is the last successful preview and B the one being built.
 *
 * ```
 * no block ── run starts ──▶ generating B (no QR) ── success ──▶ stable B
 *                                   └── failure ──▶ block removed
 * stable A ── run starts ──▶ generating B (QR A)  ── success ──▶ stable B
 *                                   └── failure ──▶ stable A
 * ```
 *
 * Reads and plain body writes use GH_TOKEN, the workflow's own token. Installing a new QR uses
 * `gh pr edit --attach`, which uploads the PNG to GitHub's attachment storage and rewrites the
 * body in one mutation; gh refuses to upload with an app installation token, so that one step
 * authenticates with PREVIEW_QR_TOKEN, a fine-grained personal access token with pull-request and
 * content write access. The workflow does nothing at all when that secret is absent.
 *
 * SECURITY: this runs in the base repository with write access and is triggered by runs of fork
 * code. It never checks out or executes anything from the pull request. Every input is either
 * GitHub API metadata or a value the trusted Vercel Preview workflow wrote to the deployment
 * record (the preview URL), and the preview URL is only ever encoded into a PNG and placed in a
 * markdown link.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Opens the managed block. Must stay in sync with the workflow's documentation. */
export const START = '<!-- preview-qr:start -->'

/** Closes the managed block. */
export const END = '<!-- preview-qr:end -->'

/** The local filename the QR is written to and referenced by until gh rewrites it. */
export const QR_FILE = 'preview-qr.png'

/** Where uploaded attachments live. Used to recognize an installed QR image. */
const ASSET_HOST = 'https://github.com/user-attachments/assets/'

/** The workflow file whose runs are the preview deployments. */
const PREVIEW_WORKFLOW = '.github/workflows/vercel-preview.yml'

/** The environment name vercel-preview.yml deploys to. */
const PREVIEW_ENVIRONMENT = 'Preview'

/**
 * Formats a deployment timestamp for the disclosure summary in UTC, as `Sep 4, 2026`. UTC so two
 * runs never disagree about the date of one deployment.
 */
export const formatDate = iso =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  )

/**
 * Splits a pull request body into the text outside the managed block and the block's parsed
 * state. Outside text is returned with the block cut out and trailing whitespace trimmed, ready
 * for the block to be appended at the bottom. A block anywhere in the body is found, which is how
 * one that a human edit pushed into the middle ends up at the bottom again on the next write.
 *
 * `state.stable.image` is the uploaded QR's URL, taken from the markdown image; it is null when
 * the block holds no attachment URL there, which makes the next successful run upload one.
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
    const image = block.match(/\[!\[Preview deployment\]\(([^)\s]+)\)\]\(/)?.[1]
    return {
      outside,
      state: {
        stable: stable ? { ...stable, image: image?.startsWith(ASSET_HOST) ? image : null } : null,
        pending: pending ?? null,
      },
    }
  } catch {
    return { outside, state: null }
  }
}

/**
 * Renders the managed block from state, or null when there is nothing to show — no successful
 * preview and none building.
 *
 * The blank lines around the image are load-bearing twice over: GitHub only renders markdown
 * inside a `<details>` HTML block when a blank line ends the block's raw-HTML run, and gh's
 * `--attach` rewrite only sees the image reference if the markdown parser produced a node for it.
 */
export const renderBlock = ({ stable, pending }) => {
  if (!stable && !pending) return null
  const summary = pending
    ? `Preview · Generating new QR code… · ${formatDate(pending.createdAt)} · <code>${pending.sha.slice(0, 7)}</code>`
    : `Preview · ${formatDate(stable.createdAt)} · <code>${stable.sha.slice(0, 7)}</code>`
  const content = stable
    ? [
        `[![Preview deployment](${stable.image})](${stable.url})`,
        '',
        `[${pending ? 'Open current preview' : 'Open preview'}](${stable.url})`,
      ]
    : ['Preview deployment is being generated.']
  const state = {
    stable: stable ? { sha: stable.sha, createdAt: stable.createdAt, url: stable.url } : null,
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

/** Joins the text outside the block with a rendered block at the bottom, or drops the block. */
export const spliceBody = (outside, block) => (block ? (outside ? `${outside}\n\n${block}` : block) : outside)

/**
 * Repairs a body after `gh pr edit --attach` in the case where gh appended the uploaded image
 * instead of rewriting the local reference. Returns the corrected body, or null when the body
 * holds no local reference and needs no repair. `before` is the body as it was sent, so the asset
 * URL gh added can be told apart from any attachment a human had already embedded.
 */
export const repairAfterAttach = ({ before, after, state }) => {
  if (!after.includes(`./${QR_FILE}`)) return null
  const assets = [...after.matchAll(/https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/g)].map(m => m[0])
  const added = assets.find(url => !before.includes(url))
  if (!added) return null
  // gh appends its own reference to the uploaded file; drop it, wherever it landed.
  const reference = new RegExp(`\\n*!?\\[[^\\]]*\\]\\(${added.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g')
  const { outside } = parseBody(after.replace(reference, ''))
  return spliceBody(outside, renderBlock({ ...state, stable: { ...state.stable, image: added } }))
}

/**
 * Decides the state the block should be in for the newest preview run. `run` is that run's
 * current status and conclusion, `deployment` the deployment it created (if any, with `url` once
 * it succeeded), and `current` the state parsed from the body. Returns the target state, or `null`
 * to leave the body alone because the run has not started yet. A target whose stable preview has
 * no image is one whose QR still has to be generated and uploaded.
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
 * Calls the GitHub REST API with the workflow token and returns the parsed JSON. GITHUB_API_URL
 * is what Actions sets it to; overriding it points the script at a stand-in server for a dry run.
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
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${route} → ${response.status} ${await response.text()}`)
  return response.json()
}

/**
 * Resolves the one open pull request in this repository that the commit belongs to. Fork branch
 * names are not unique, so association is by commit identity; the caller then requires the pull
 * request's current head to still be this commit, since a later push makes the run stale.
 */
const resolvePullRequest = async (repo, sha) => {
  const pulls = await api(`/repos/${repo}/commits/${sha}/pulls?per_page=100`)
  const candidates = pulls.filter(pr => pr.state === 'open' && pr.base.repo.full_name === repo)
  if (candidates.length === 0) return null
  if (candidates.length > 1) {
    throw new Error(`Commit ${sha} belongs to ${candidates.length} open pull requests; refusing to pick one.`)
  }
  // Re-fetch rather than trusting the association listing, which can lag behind a push.
  return api(`/repos/${repo}/pulls/${candidates[0].number}`)
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

/** Writes the body with a plain update. Used for every transition that installs no new image. */
const updateBody = (repo, number, body) =>
  api(`/repos/${repo}/pulls/${number}`, { method: 'PATCH', body: JSON.stringify({ body }) })

/**
 * Generates the QR PNG and installs it with `gh pr edit --attach`, which uploads it and rewrites
 * the body in one mutation. Run from a scratch directory so the body's `./preview-qr.png` and the
 * `--attach` path resolve to the same absolute file. Because gh writes nothing when the upload
 * fails, a failure here leaves the previous body — and its QR — in place.
 */
const installQr = ({ repo, number, body, url }) => {
  const dir = mkdtempSync(path.join(process.env.RUNNER_TEMP ?? tmpdir(), 'preview-qr-'))
  // -s 8: 8px modules, comfortably scannable from a monitor. -m 2: two-module quiet zone.
  // -l M: medium error correction, so a slightly blurred phone camera still reads it.
  execFileSync('qrencode', ['-o', path.join(dir, QR_FILE), '-s', '8', '-m', '2', '-l', 'M', url], {
    stdio: 'inherit',
  })
  writeFileSync(path.join(dir, 'pr-body.md'), body)
  execFileSync(
    'gh',
    ['pr', 'edit', String(number), '--repo', repo, '--body-file', 'pr-body.md', '--attach', `./${QR_FILE}`],
    { cwd: dir, stdio: 'inherit', env: { ...process.env, GH_TOKEN: process.env.PREVIEW_QR_TOKEN } },
  )
}

/** Reconciles the managed block of the pull request the commit belongs to. */
const main = async sha => {
  const repo = process.env.GITHUB_REPOSITORY
  const pr = await resolvePullRequest(repo, sha)
  if (!pr) {
    console.log(`No open pull request in ${repo} contains ${sha}; nothing to do.`)
    return
  }
  if (pr.head.sha !== sha) {
    console.log(`PR #${pr.number} has moved on to ${pr.head.sha}; ignoring stale event for ${sha}.`)
    return
  }
  const run = await newestPreviewRun(repo, sha)
  if (!run) {
    console.log(`No Vercel Preview run for ${sha}; nothing to do.`)
    return
  }
  const deployment = await deploymentForRun(repo, sha, run.id)
  const { outside, state } = parseBody(pr.body)
  const target = decide({ run, deployment, current: state })
  if (!target) {
    console.log(`Vercel Preview run ${run.id} is ${run.status}; leaving PR #${pr.number} as it is.`)
    return
  }
  if (run.status === 'completed' && run.conclusion === 'success' && !deployment?.url) {
    console.warn(`Run ${run.id} succeeded but recorded no preview URL; restoring the previous preview.`)
  }

  const installing = Boolean(target.stable && !target.stable.image)
  const block = renderBlock(installing ? { ...target, stable: { ...target.stable, image: `./${QR_FILE}` } } : target)
  const body = spliceBody(outside, block)
  if (body === (pr.body ?? '').trimEnd()) {
    console.log(`PR #${pr.number} already reflects run ${run.id}; nothing to write.`)
    return
  }

  // Freshness check as close to the write as possible: a push during the API calls above makes
  // this run stale, and a human may have edited the description in the meantime.
  const latest = await api(`/repos/${repo}/pulls/${pr.number}`)
  if (latest.state !== 'open' || latest.head.sha !== sha) {
    console.log(`PR #${pr.number} changed under us (state ${latest.state}, head ${latest.head.sha}); not writing.`)
    return
  }
  const fresh = spliceBody(parseBody(latest.body).outside, block)

  if (!installing) {
    await updateBody(repo, pr.number, fresh)
    const outcome = target.pending
      ? `generating ${target.pending.sha.slice(0, 7)}`
      : target.stable
        ? `stable ${target.stable.sha.slice(0, 7)}`
        : 'block removed'
    console.log(`PR #${pr.number}: ${outcome}.`)
    return
  }

  installQr({ repo, number: pr.number, body: fresh, url: target.stable.url })
  const written = (await api(`/repos/${repo}/pulls/${pr.number}`)).body ?? ''
  const repaired = repairAfterAttach({ before: fresh, after: written, state: target })
  if (repaired) {
    console.warn('gh appended the QR instead of rewriting its reference; moving it into the block.')
    await updateBody(repo, pr.number, repaired)
  } else if (written.includes(`./${QR_FILE}`) || !parseBody(written).state?.stable?.image) {
    throw new Error('The QR upload did not leave an attachment URL in the managed block.')
  }
  console.log(`PR #${pr.number}: installed QR for ${target.stable.url} (${target.stable.sha.slice(0, 7)}).`)
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
