import { type ChildProcess, spawn } from 'child_process'
import { bin, install } from 'cloudflared'
import fs from 'fs'
import https from 'https'
import path from 'path'

/** One named Cloudflare Tunnel in the pool: a CLI-created tunnel routed to `${hostname}`, with its connector token. */
export interface TunnelCandidate {
  name: string
  hostname: string
  token: string
}

const CONNECTOR_LOG_PATH = path.resolve(process.cwd(), 'cloudflared-browserstack.log')
const CLAIM_TIMEOUT_MS = 30000
const REQUEST_TIMEOUT_MS = 5000
const POLL_INTERVAL_MS = 1000
// A named tunnel can have multiple connectors registered at once, and Cloudflare's edge
// load-balances PER REQUEST across all of them — so one 200 proves nothing about where the next
// request goes. Once we see a first success, we require this many more consecutive successes
// (spaced out) before trusting the candidate as genuinely exclusive.
const VERIFY_BURST_COUNT = 5
const VERIFY_INTERVAL_MS = 400
// Unauthenticated status route served by tunnelTokenGate (vite.config.ts), so a run can ask "is
// anyone already answering on this hostname, and if so which run?" BEFORE attaching its own
// connector. See checkOccupancy for why asking first is the whole trick.
const TUNNEL_STATUS_PATH = '/__tunnel-status'
// How long to keep waiting for a fully-occupied pool to free up before giving up, and how long to
// pause between full rescans while waiting. The wait has to outlast however long another run holds
// its tunnel — observed BrowserStack test steps have run 18-20 min, and a run can be queued behind
// more than one of those, so a ceiling near 20 min would expire just as a slot came free.
const POOL_WAIT_TIMEOUT_MS = 45 * 60 * 1000
const POOL_RESCAN_INTERVAL_MS = 10000
// How many consecutive passes may go by with no tunnel showing any sign of another run before the
// wait is abandoned. The long POOL_WAIT_TIMEOUT_MS only makes sense while tunnels are genuinely
// held — a busy status answer, or a foreign em rejecting this run's token. When the edge instead
// times out or refuses every request, no run is holding anything and nothing will free up; waiting
// 45 min just burns a runner (run 36739868119 spent ten minutes this way before it was cancelled
// by hand). A pass over an unresponsive pool costs 1-3 min (5s per timed-out pre-check, up to
// CLAIM_TIMEOUT_MS per failed claim), so two passes give a blip at a pass boundary room to clear
// while still failing within a few minutes.
const UNRESPONSIVE_PASS_LIMIT = 2

/** Parses the CLOUDFLARE_TUNNEL_POOL env var: a JSON array of `{ name, hostname, token }`. */
export function parseTunnelPool(json: string): TunnelCandidate[] {
  const pool: unknown = JSON.parse(json)
  const isValid =
    Array.isArray(pool) &&
    pool.length > 0 &&
    pool.every((c: unknown) => {
      const candidate = c as Record<string, unknown>
      return (
        candidate &&
        typeof candidate === 'object' &&
        typeof candidate.name === 'string' &&
        typeof candidate.hostname === 'string' &&
        typeof candidate.token === 'string'
      )
    })
  if (!isValid) {
    throw new Error('CLOUDFLARE_TUNNEL_POOL must be a non-empty JSON array of { name, hostname, token }')
  }
  return pool as TunnelCandidate[]
}

/** A run-varying (not always-zero) starting index, so concurrent runs don't all race for the same tunnel first. */
function startingOffset(poolSize: number): number {
  const seed = process.env.GITHUB_RUN_ID || process.env.GITHUB_RUN_ATTEMPT || String(process.pid)
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % poolSize
}

/**
 * Performs one GET over a brand-new connection, resolving to its status code and (truncated) body,
 * or null if the request never completed.
 *
 * Uses a plain https.request with agent: false instead of fetch — fetch's pooled/keep-alive
 * connection reuses the same underlying connection across calls, and if Cloudflare's edge sticks
 * a connection to one backend connector for its lifetime (which the data here says it does),
 * every probe after the first is just re-testing the same connection and can never reveal a
 * different backend. Passing agent: false forces a brand new connection each call, giving each
 * probe an independent chance to land on whichever backend is actually live right now.
 */
async function requestOnce(url: string): Promise<{ statusCode: number; body: string } | null> {
  return new Promise(resolve => {
    const req = https.request(url, { method: 'GET', agent: false, timeout: REQUEST_TIMEOUT_MS }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => {
        // The status payload is tiny; Cloudflare's HTML error pages are not. Cap what we buffer.
        if (body.length < 2048) body += chunk
      })
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }))
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
    req.end()
  })
}

/** Sends one app-gate-token request and returns its status code, or null if nothing answered (timeout or connection error). */
async function probeOnce(checkUrl: string): Promise<number | null> {
  const res = await requestOnce(checkUrl)
  return res ? res.statusCode : null
}

/**
 * A failed claim, tagged with whether the failure is evidence that another run holds the tunnel.
 *
 * The distinction drives the pool wait. A foreign answer (another run's em 403ing this run's
 * token) means the tunnel is genuinely held and will free up when that run ends, so it is worth
 * waiting for. A timeout or connection error is only evidence that the edge, or this runner's path
 * to it, is not answering — it says nothing about who holds the tunnel, so it is neither reported
 * as "another connector is live" nor allowed to keep the run waiting for a tunnel to free up.
 */
class ClaimError extends Error {
  constructor(
    message: string,
    public readonly contention: boolean,
  ) {
    super(message)
    this.name = 'ClaimError'
  }
}

/** What a pre-attach probe found on a hostname. `unknown` means the edge answered in a way we can't classify. */
type Occupancy = { state: 'free' } | { state: 'taken'; reason: string } | { state: 'unknown'; reason: string }

/**
 * Asks whether a tunnel is already in use — WITHOUT attaching our own connector first.
 *
 * That ordering is the entire point. A named tunnel accepts multiple simultaneous connectors and
 * Cloudflare load-balances per request across all of them, so once we've attached, a 200 might be
 * our own server and a 403 might be someone else's, at random — the test can no longer distinguish
 * them. Before we attach we aren't in the mix, so anything that answers at all is unambiguously
 * another run.
 *
 * Cloudflare returns 530 (error 1033) for a named tunnel with no connector registered, which is a
 * clean "nobody home". Verified empirically against all five pool hostnames while idle.
 */
async function checkOccupancy(hostname: string): Promise<Occupancy> {
  const res = await requestOnce(`https://${hostname}${TUNNEL_STATUS_PATH}`)
  if (!res) return { state: 'unknown', reason: 'no response from the Cloudflare edge' }
  // 530/1033: the tunnel exists but has no connector attached.
  if (res.statusCode === 530) return { state: 'free' }
  if (res.statusCode === 200) {
    const run = /"run"\s*:\s*"([^"]*)"/.exec(res.body)?.[1]
    const ours = run && run === (process.env.GITHUB_RUN_ID || '')
    return {
      state: 'taken',
      reason: ours
        ? `a connector from this same run (${run}) is still attached — likely a leftover from a previous attempt`
        : run
          ? `in use by run ${run}`
          : 'an em instance is already answering',
    }
  }
  // A 403 is the token gate rejecting us, which still means someone's em is live on the other end.
  // (Also what an em without the status route returns, so treat it the same way.)
  if (res.statusCode === 403) return { state: 'taken', reason: 'an em instance is already answering' }
  return { state: 'unknown', reason: `unexpected status ${res.statusCode}` }
}

/**
 * Starts a connector for one candidate and waits for THIS run's dev server to answer through
 * its public hostname.
 *
 * A named tunnel accepts multiple simultaneous connectors (that's Cloudflare's HA design), and
 * Cloudflare's edge load-balances PER REQUEST across every connector currently registered for
 * that tunnel — so even a single genuine 200 back (this run's Vite server recognizing its own
 * app-gate token — see tunnelTokenGate in vite.config.ts) does NOT prove the hostname is
 * exclusively ours: the very next request could land on a different run's connector instead.
 * Confirmed empirically — two real concurrent runs both got an initial 200 on the same tunnel,
 * then had real cross-talk for the rest of their sessions. So after the first success we require
 * VERIFY_BURST_COUNT more consecutive successes before trusting the claim; a non-200 answer
 * among them means another connector is live here too, and we give up on this candidate entirely
 * (not retry it — we already have proof it's shared).
 *
 * A probe that gets no answer at all is a different failure: a request that timed out or never
 * connected was not load-balanced to anybody, so it is no evidence of a second connector. It still
 * abandons the candidate — a claim that could not be verified is not trusted — but the ClaimError
 * says what actually happened and is not counted as contention.
 */
async function claim(
  candidate: TunnelCandidate,
  appGateToken: string,
): Promise<{ url: string; process: ChildProcess }> {
  if (!fs.existsSync(bin)) {
    await install(bin)
  }

  const logStream = fs.createWriteStream(CONNECTOR_LOG_PATH, { flags: 'a' })
  logStream.write(`\n--- claiming ${candidate.name} (${candidate.hostname}) ---\n`)

  // Child-scoped TUNNEL_TOKEN carries this candidate's connector token; it shadows the parent's
  // TUNNEL_TOKEN (the Vite app-gate token) for this process only, same seam PR #4622 established.
  const childEnv: NodeJS.ProcessEnv = { ...process.env, TUNNEL_TOKEN: candidate.token }
  // cloudflared logs its entire environment at startup. It masks TUNNEL_TOKEN, because it knows
  // that one is a credential, but it has no reason to treat CLOUDFLARE_TUNNEL_POOL as anything
  // special — so inheriting the pool writes every connector token in it, in plaintext, into the
  // connector log this function is about to pipe to. The connector only ever needs its own token,
  // handed to it above, so the pool has no business being in this process at all.
  delete childEnv.CLOUDFLARE_TUNNEL_POOL

  // These are remotely-managed tunnels: Cloudflare's stored ingress config per tunnel decides the
  // origin, and this --url is only a fallback for a tunnel missing that config. The CI pool's
  // stored ingress is http://localhost:3000 (CI serves plain HTTP via HTTP=1); the dev pool's is
  // https://localhost:3000 with No TLS Verify, so a default `yarn start` works as the origin for
  // local runs. The tunnel's public side is real-cert HTTPS either way. The fallback here matches
  // the CI pool.
  const proc = spawn(
    bin,
    ['tunnel', '--no-autoupdate', '--protocol', 'http2', 'run', '--url', 'http://localhost:3000'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: childEnv,
    },
  )
  proc.stdout?.pipe(logStream)
  proc.stderr?.pipe(logStream)

  let exited = false
  proc.once('exit', () => {
    exited = true
  })

  const checkUrl = `https://${candidate.hostname}/?__token=${appGateToken}`
  const start = Date.now()
  // The last status that was neither our 200 nor the edge's 530 "no connector yet" — i.e. somebody
  // else's server answering. Decides whether a timeout below is contention or silence.
  let foreignStatus: number | null = null
  let answered = false
  try {
    while (Date.now() - start < CLAIM_TIMEOUT_MS) {
      if (exited) {
        throw new ClaimError(`connector for ${candidate.name} exited before claim`, false)
      }
      const status = await probeOnce(checkUrl)
      if (status === 200) {
        for (let i = 0; i < VERIFY_BURST_COUNT; i++) {
          await new Promise(resolve => setTimeout(resolve, VERIFY_INTERVAL_MS))
          const verifyStatus = await probeOnce(checkUrl)
          if (verifyStatus === null) {
            throw new ClaimError(
              `${candidate.name} answered once but stopped responding during verification ` +
                `${i + 1}/${VERIFY_BURST_COUNT} — no response from the Cloudflare edge (network/edge ` +
                `problem, not evidence of a second connector)`,
              false,
            )
          }
          if (verifyStatus !== 200) {
            throw new ClaimError(
              `${candidate.name} answered once but failed verification ${i + 1}/${VERIFY_BURST_COUNT} ` +
                `with status ${verifyStatus} — another connector is live on this hostname too ` +
                `(Cloudflare is load-balancing between them)`,
              true,
            )
          }
        }
        return { url: `https://${candidate.hostname}/`, process: proc }
      }
      // Any other status (a different run's 403, a 404, etc.) means occupied or not ready yet.
      if (status !== null) {
        answered = true
        if (status !== 530) foreignStatus = status
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
    if (foreignStatus !== null) {
      throw new ClaimError(
        `timed out waiting for ${candidate.hostname} to answer with this run's app-gate token ` +
          `(last answered ${foreignStatus} — another run's em is answering on this hostname)`,
        true,
      )
    }
    throw new ClaimError(
      answered
        ? `timed out waiting for ${candidate.hostname} to answer with this run's app-gate token ` +
            `(the edge never saw this run's connector register)`
        : `timed out waiting for ${candidate.hostname} to answer with this run's app-gate token ` +
            `(no response from the Cloudflare edge at all)`,
      false,
    )
  } catch (err) {
    if (!proc.killed) proc.kill()
    throw err
  }
}

/**
 * Claims one tunnel from the pool, waiting for a slot if every tunnel is currently busy.
 *
 * Each pass asks every tunnel whether it's occupied (checkOccupancy — a single cheap request, no
 * connector attached) and only tries to claim the ones that look free. That makes skipping a busy
 * tunnel cost one request rather than a full CLAIM_TIMEOUT_MS of attaching and waiting, so a whole
 * pool can be scanned in about a second.
 *
 * The pre-check is not a lock: two runs can see the same tunnel free in the same instant and both
 * attach. The verification burst inside claim() is the backstop for that narrow race — the
 * pre-check does the routine work, the burst catches the straggler.
 *
 * Candidates are visited from a run-varying offset so simultaneous runs don't queue up in the same
 * order.
 *
 * The long wait is reserved for contention. Each pass records whether any tunnel showed another
 * run holding it; after UNRESPONSIVE_PASS_LIMIT consecutive passes with no such sign — every
 * pre-check and claim ending in silence rather than a foreign answer — the edge is not responding,
 * and the run fails with that diagnosis instead of waiting out POOL_WAIT_TIMEOUT_MS. A single
 * genuine busy answer resets the count.
 *
 * Returns the winning candidate's public URL and its connector process; the caller is
 * responsible for killing that process on completion.
 */
export async function findFirstAvailableTunnel(
  pool: TunnelCandidate[],
  appGateToken: string,
): Promise<{ url: string; name: string; process: ChildProcess }> {
  const offset = startingOffset(pool.length)
  const deadline = Date.now() + POOL_WAIT_TIMEOUT_MS
  let errors: string[] = []
  let waiting = false
  let unresponsivePasses = 0

  while (true) {
    // Errors only describe the pass that produced them — otherwise a long wait accumulates one
    // entry per tunnel per rescan and the final message becomes unreadable.
    errors = []
    let contention = false

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(offset + i) % pool.length]
      const occupancy = await checkOccupancy(candidate.hostname)

      if (occupancy.state === 'taken') {
        console.info(`cloudflared tunnel: ${candidate.name} busy (${occupancy.reason}), skipping`)
        errors.push(`${candidate.name}: ${occupancy.reason}`)
        contention = true
        continue
      }
      if (occupancy.state === 'unknown') {
        // Don't let an unclassifiable edge response deadlock the whole pool — attempt the claim and
        // let the verification burst be the judge.
        console.info(
          `cloudflared tunnel: ${candidate.name} pre-check inconclusive (${occupancy.reason}), trying anyway`,
        )
      }

      try {
        const { url, process: proc } = await claim(candidate, appGateToken)
        console.info(`cloudflared tunnel: claimed ${candidate.name} (${candidate.hostname})`)
        return { url, name: candidate.name, process: proc }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.info(`cloudflared tunnel: ${candidate.name} unavailable (${message}), trying next candidate...`)
        errors.push(`${candidate.name}: ${message}`)
        // Anything other than a ClaimError (cloudflared failing to install, say) is not a sign of
        // another run either.
        if (err instanceof ClaimError && err.contention) contention = true
      }
    }

    unresponsivePasses = contention ? 0 : unresponsivePasses + 1
    if (unresponsivePasses >= UNRESPONSIVE_PASS_LIMIT) {
      throw new Error(
        `No tunnel in the pool could be claimed in ${unresponsivePasses} consecutive passes, and none ` +
          `showed another run holding it — the Cloudflare edge (or this runner's connection to it) is ` +
          `not responding, so waiting for a tunnel to free up would not help:\n${errors.join('\n')}`,
      )
    }

    if (Date.now() >= deadline) break

    if (!waiting) {
      console.info(
        `cloudflared tunnel: no tunnel in the pool of ${pool.length} could be claimed — waiting up to ` +
          `${Math.round(POOL_WAIT_TIMEOUT_MS / 60000)} min for one to free up...`,
      )
      waiting = true
    }
    await new Promise(resolve => setTimeout(resolve, POOL_RESCAN_INTERVAL_MS))
  }

  throw new Error(
    `All ${pool.length} tunnels in the pool were still unavailable after waiting ` +
      `${Math.round(POOL_WAIT_TIMEOUT_MS / 60000)} min:\n${errors.join('\n')}`,
  )
}
