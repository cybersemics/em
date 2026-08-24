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
    const req = https.request(url, { method: 'GET', agent: false, timeout: 5000 }, res => {
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

/** Sends one app-gate-token request and reports whether it got a genuine 200. */
async function probeOnce(checkUrl: string): Promise<boolean> {
  const res = await requestOnce(checkUrl)
  return res?.statusCode === 200
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
 * VERIFY_BURST_COUNT more consecutive successes before trusting the claim; any failure among
 * them means another connector is live here too, and we give up on this candidate entirely
 * (not retry it — we already have proof it's shared).
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

  // http:// here matches the origin the CI "Serve" step starts with HTTP=1 — Cloudflare's tunnel already
  // terminates HTTPS at its edge for Safari (a real CA-signed cert on the public hostname), so this local
  // connector-to-origin hop never needs its own TLS. (Also: these are remotely-managed tunnels, so this
  // --url is only a fallback — Cloudflare's stored ingress config for the hostname takes precedence, and
  // must point at the same http://localhost:3000 origin.)
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
  try {
    while (Date.now() - start < CLAIM_TIMEOUT_MS) {
      if (exited) {
        throw new Error(`connector for ${candidate.name} exited before claim`)
      }
      if (await probeOnce(checkUrl)) {
        for (let i = 0; i < VERIFY_BURST_COUNT; i++) {
          await new Promise(resolve => setTimeout(resolve, VERIFY_INTERVAL_MS))
          if (!(await probeOnce(checkUrl))) {
            throw new Error(
              `${candidate.name} answered once but failed verification ${i + 1}/${VERIFY_BURST_COUNT} — ` +
                `another connector is live on this hostname too (Cloudflare is load-balancing between them)`,
            )
          }
        }
        return { url: `https://${candidate.hostname}`, process: proc }
      }
      // Any other status (a different run's 403, a 404, etc.) means occupied or not ready yet.
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
    throw new Error(`timed out waiting for ${candidate.hostname} to answer with this run's app-gate token`)
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
 * order. Returns the winning candidate's public URL and its connector process; the caller is
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

  while (true) {
    // Errors only describe the pass that produced them — otherwise a long wait accumulates one
    // entry per tunnel per rescan and the final message becomes unreadable.
    errors = []

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(offset + i) % pool.length]
      const occupancy = await checkOccupancy(candidate.hostname)

      if (occupancy.state === 'taken') {
        console.info(`cloudflared tunnel: ${candidate.name} busy (${occupancy.reason}), skipping`)
        errors.push(`${candidate.name}: ${occupancy.reason}`)
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
      }
    }

    if (Date.now() >= deadline) break

    if (!waiting) {
      console.info(
        `cloudflared tunnel: all ${pool.length} tunnels in the pool are busy — waiting up to ` +
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
