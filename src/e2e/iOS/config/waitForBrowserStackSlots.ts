/** BrowserStack's Automate plan endpoint, which reports the account's parallel-session usage. */
const PLAN_URL = 'https://api.browserstack.com/automate/plan.json'

/** How long to keep waiting for the account's parallel-session pool to free up before giving up. Matched to the Cloudflare tunnel pool's ceiling (cloudflareTunnelPool.ts), since a run can be queued behind a full 18-20 min iOS suite more than once. */
const WAIT_TIMEOUT_MS = 45 * 60 * 1000

/** How long to pause between polls. Jitter is added per poll so simultaneous runs do not rescan (and then burst their session creations) in lockstep. */
const POLL_INTERVAL_MS = 15000
const POLL_JITTER_MS = 5000

/** How often to report that we are still waiting, so a long wait does not look like a hang. */
const PROGRESS_INTERVAL_MS = 60000

/** The account's parallel-session usage on the Automate product, and how many more sessions it can currently take. */
interface SlotUsage {
  running: number
  allowed: number
  available: number
}

/**
 * Reads the account's current Automate parallel-session usage.
 *
 * Only the Automate endpoint is consulted, because Automate (browser sessions — CI iOS Safari, both
 * from ios.yml and tdd.yml) and App Automate (native app sessions — agent sessions started by
 * scripts/start-ios-session.mjs) have SEPARATE counters rather than one shared quota. Measured
 * against the real account: with a single live Automate session,
 * api.browserstack.com/automate/plan.json reported `parallel_sessions_running: 1` while
 * api-cloud.browserstack.com/app-automate/plan.json still reported `0`, and each product reports its
 * own `parallel_sessions_max_allowed: 5`. So an agent holding an App Automate device does not
 * consume a slot this suite needs, and summing the two would make the suite wait for headroom it
 * does not require.
 *
 * @throws Error naming the HTTP status or malformed payload, so a failure here is never mistaken for a full pool.
 */
const getSlotUsage = async (): Promise<SlotUsage> => {
  const user = process.env.BROWSERSTACK_USERNAME
  const key = process.env.BROWSERSTACK_ACCESS_KEY
  if (!user || !key) {
    throw new Error(
      'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set to read the BrowserStack parallel-session plan.',
    )
  }

  const res = await fetch(PLAN_URL, {
    headers: { authorization: `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}` },
  })
  if (!res.ok) {
    throw new Error(`${PLAN_URL} responded HTTP ${res.status} ${res.statusText}`.trim())
  }

  const plan: unknown = await res.json().catch(() => null)
  const running = (plan as Record<string, unknown> | null)?.parallel_sessions_running
  const allowed = (plan as Record<string, unknown> | null)?.parallel_sessions_max_allowed
  if (typeof running !== 'number' || typeof allowed !== 'number') {
    throw new Error(
      `${PLAN_URL} did not report parallel_sessions_running and parallel_sessions_max_allowed as numbers: ${JSON.stringify(plan)}`,
    )
  }

  return { running, allowed, available: allowed - running }
}

/**
 * Waits until the BrowserStack account has room for `needed` more parallel sessions.
 *
 * The account's parallel-session pool is shared by every consumer of the same credentials — this
 * suite from ios.yml, the same suite from tdd.yml's iOS job, and any manual `yarn test:ios`. Without
 * this wait, an over-subscribed pool surfaces as a session-creation timeout on `POST .../session`
 * once workers are already running, which costs a spec its retry budget instead of a quiet wait.
 * Asking the API for real headroom replaces the repo-wide GitHub concurrency group that used to
 * serialize every run whether or not the pool was actually busy.
 *
 * This is a check-then-create wait, not a reservation: two runs can see the same headroom in the
 * same instant. `specFileRetriesDeferred` (wdio.base.conf.ts) remains the fallback for that race.
 *
 * @param needed The number of sessions the run is about to open, i.e. WDIO's maxInstances.
 * @throws Error naming the last observed usage if the pool does not free up within the timeout, or the API error if the plan cannot be read.
 */
const waitForBrowserStackSlots = async (needed: number): Promise<void> => {
  const start = Date.now()
  let lastProgress = start

  while (true) {
    const usage = await getSlotUsage()
    const waitedMin = Math.round((Date.now() - start) / 60000)

    if (usage.available >= needed) {
      console.info(
        `BrowserStack slots: ${usage.available}/${usage.allowed} available, need ${needed} — proceeding` +
          (waitedMin > 0 ? ` after waiting ${waitedMin} min` : ''),
      )
      return
    }

    if (Date.now() - start >= WAIT_TIMEOUT_MS) {
      throw new Error(
        `BrowserStack still had no room for ${needed} parallel sessions after waiting ` +
          `${Math.round(WAIT_TIMEOUT_MS / 60000)} min: ${usage.running}/${usage.allowed} sessions running ` +
          `(${usage.available} available). Another CI run or agent session is holding the pool.`,
      )
    }

    // Report on the first pass that has to wait, then periodically.
    if (lastProgress === start || Date.now() - lastProgress >= PROGRESS_INTERVAL_MS) {
      console.info(
        `BrowserStack slots: need ${needed}, ${usage.running}/${usage.allowed} sessions running ` +
          `(${usage.available} available) — waited ${waitedMin} min of ` +
          `${Math.round(WAIT_TIMEOUT_MS / 60000)} min...`,
      )
      lastProgress = Date.now()
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS + Math.random() * POLL_JITTER_MS))
  }
}

export default waitForBrowserStackSlots
