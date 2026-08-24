import http from 'http'
import https from 'https'
import path from 'path'
import { drainConsoleProxy, waitForConsoleProxy } from '../../../util/consoleProxy'
import resetApp from '../helpers/resetApp'

const LOCAL_URL = 'https://localhost:3000'

/** Marks the response as em's own HTML. `<div id="root" data-app="em">` is static markup in index.html (the container src/index.tsx mounts React into), and the attribute is ours alone — a generic `id="root"` could plausibly appear in a Cloudflare edge error page or the Vite token gate's 403, which are the documents this check exists to reject. */
const APP_HTML_MARKER = 'data-app="em"'

/** The URL the device loads: the public tunnel URL when one is set (BrowserStack), else the local dev server. */
const appUrl = (): string =>
  // Inserts `/` before `?`. String concat on `https://host` yields `https://host?__token=`, which
  // iOS Safari does not load as `/` — first session 403s, later spec retries can still pass.
  new URL(process.env.CLOUDFLARED_URL || LOCAL_URL).href

/**
 * Performs one GET against the app origin, resolving to its status code and (truncated) body, or
 * null if the request never completed.
 *
 * Certificate verification is relaxed for the loopback dev server only, whose cert is self-signed
 * (@vitejs/plugin-basic-ssl) and which no third party can sit between; a public tunnel URL is
 * verified normally. The body is capped because Cloudflare's HTML error pages are not small and we
 * only need a snippet of one to describe it.
 */
const requestOrigin = (url: string): Promise<{ statusCode: number; body: string } | null> =>
  new Promise(resolve => {
    const request = url.startsWith('https:') ? https.request : http.request
    const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url)
    const req = request(url, { method: 'GET', timeout: 10000, rejectUnauthorized: !isLoopback }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => {
        if (body.length < 4096) body += chunk
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

/** Describes what an origin answered with, for an error message: status, <title>, and a snippet of the markup. */
const describeResponse = (res: { statusCode: number; body: string } | null): string => {
  if (!res) return 'no response at all (connection refused or timed out)'
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(res.body)?.[1]?.trim()
  const snippet = res.body.replace(/\s+/g, ' ').trim().slice(0, 200)
  return `HTTP ${res.statusCode}${title ? `, title "${title}"` : ''} — ${snippet || '(empty body)'}`
}

/**
 * Checks that the origin the tests will run against actually serves em.
 *
 * Reachability alone is not enough: a Cloudflare edge error page (502, 1033, "can't reach origin")
 * and the Vite token gate's 403 are both well-formed HTML documents, so a run that only checks for a
 * response will happily test a page that never contained the app (#4814).
 *
 * @throws Error naming what the origin answered with instead of em.
 */
export const checkAppRunning = async (url: string = LOCAL_URL): Promise<void> => {
  const res = await requestOrigin(url)
  if (res?.statusCode === 200 && res.body.includes(APP_HTML_MARKER)) return
  throw new Error(
    `${url} did not serve em: ${describeResponse(res)}\n` +
      (url === LOCAL_URL
        ? 'Start the app locally (yarn start) before running tests.'
        : 'The origin is wrong or unreachable — check that the tunnel points at the protocol and port the app is served on.'),
  )
}

/**
 * Base WDIO configuration shared between local and BrowserStack configs.
 * This contains common settings for iOS Safari testing.
 */
const baseConfig = {
  // Runner Configuration
  runner: 'local' as const,

  // Use glob pattern to run all tests in __tests__ directory
  specs: [path.resolve(process.cwd(), 'src/e2e/iOS/__tests__/**/*.ts')],
  exclude: [],

  // Setup Files
  // Import @wdio/globals to ensure browser, $, $$, expect are available
  setupFiles: [path.resolve(process.cwd(), 'src/e2e/iOS/setup.ts')],

  // Capabilities
  // Spec files run in parallel sessions, but cap at 2 (we have 3 specs) rather than opening all at once.
  // Reasons: (1) bursting N simultaneous session-creations is what timed out the 3rd session on
  // BrowserStack (#0-2 "aborted due to timeout" on POST .../session); staggering avoids the spike.
  // (2) leave headroom in the shared BrowserStack parallel pool for agent-driven sessions and other CI runs.
  maxInstances: 2,

  // Base iOS Safari capabilities shared between local and browserStack configs. Individual configs can override or extend these.
  baseCapabilities: {
    platformName: 'iOS' as const,
    browserName: 'Safari' as const,
    'appium:automationName': 'XCUITest' as const,
  },

  // Test Configurations
  logLevel: 'warn' as const,
  // Per-package override: silence @wdio/browserstack-service's observability bookkeeping (plumbing for BrowserStack's dashboard, not diagnostic).
  logLevels: {
    '@wdio/browserstack-service': 'error' as const,
  },
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Retry a whole spec file on failure, including failures to acquire a BrowserStack session when the
  // account's parallel pool is exhausted by concurrent runs (the "WebDriverError: ... aborted due to
  // timeout" on POST .../session). specFileRetriesDeferred re-queues the failed spec at the END, so it
  // retries only after the other specs finish and free up sessions — i.e. it waits for a slot rather
  // than failing. Also auto-heals home.ts, which is known to flake under parallel load (#1475, #1523).
  specFileRetries: 5,
  specFileRetriesDelay: 30,
  specFileRetriesDeferred: true,

  // Spec reporter gives per-it() pass/fail visibility in CI logs.
  reporters: ['spec'],

  // Framework Configuration
  framework: 'mocha' as const,
  mochaOpts: {
    ui: 'bdd' as const,
    // Per-runnable budget. beforeTest runs inside it, so every wait in the hook (resetApp's waitUntil,
    // then waitForConsoleProxy) must fit strictly below this value — otherwise mocha times out first and
    // its generic message wins the race against the hook's diagnostic one. See src/e2e/iOS/helpers/resetApp.ts.
    timeout: 90000,
  },

  // Hooks
  // Verify the origin the device will load actually serves em, BEFORE any session is created.
  // Reason: this is the one place a wrong origin can be caught for free. A worker cannot change
  // specFileRetries, so a bad origin discovered later costs every spec its full retry budget —
  // 4 specs x 5 retries x a 90s mocha timeout each, 82 min of it, on a page that never contained
  // the app (#4814). Throwing here (rather than exiting) lets each config's own catch clean up
  // first — notably killing the cloudflared connector, which would otherwise be orphaned and hold
  // a pool hostname against other runs.
  // Skipped only when there is nothing meaningful to probe: in CI without CLOUDFLARED_URL the app
  // is served over plain HTTP (ios.yml's `HTTP=1 yarn servebuild`), so the https localhost URL is
  // not the origin under test.
  onPrepare: async function () {
    if (!process.env.CLOUDFLARED_URL && process.env.CI) return
    await checkAppRunning(appUrl())
  },

  // Navigate once at the start of the session.
  // CLOUDFLARED_URL: set by BrowserStack config (or CI) — a public HTTPS URL with a trusted cert.
  // localhost: used for local Appium testing.
  before: async function () {
    const baseUrl = appUrl()
    await browser.url(baseUrl)

    // Wait for em to have MOUNTED, not merely for the document to have parsed. A `<body>` proves
    // nothing — a Cloudflare error page has one, as does the token gate's 403 — whereas em's own
    // root container having children proves the app's own JavaScript ran (#4814). onPrepare already
    // rejects an origin that is wrong from the runner's perspective; this catches the case where the
    // device reaches something different (edge cache, gate cookie, connector load-balancing).
    try {
      await browser.waitUntil(
        async () => browser.execute(() => !!document.querySelector('[data-app="em"]')?.childElementCount),
        {
          timeout: 30000,
          interval: 500,
        },
      )
    } catch {
      // Report what the device is actually looking at, plus what the runner sees at the same URL.
      const page = await browser
        .execute(() => ({
          url: location.href,
          title: document.title,
          text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
        }))
        .catch(() => null)
      const fromRunner = describeResponse(await requestOrigin(baseUrl))
      throw new Error(
        `em did not load at ${baseUrl} — the page is not the app.\n` +
          `on device: ${page ? `${page.url} — title "${page.title}" — ${page.text || '(no text)'}` : 'page could not be inspected'}\n` +
          `from runner: ${fromRunner}`,
      )
    }
  },

  // Before each test: reset to a clean, empty thoughtspace (clear storage, refresh, dismiss the tutorial).
  beforeTest: async function () {
    await resetApp()

    // Due to limitations in BrowserStack, we proxy console.log calls into a buffer to access them
    // (the "console proxy", src/util/consoleProxy.ts, enabled via VITE_BROWSER_CONSOLE_CAPTURE=1 — see
    // .github/workflows/ios.yml). Wait for it to install after the reload resetApp performed.
    await waitForConsoleProxy()
  },

  // After each test: drain the console proxy buffer and print it under the test title so browser-side console output is grouped per-it() in CI logs.
  afterTest: async function (test: { fullTitle: string; title: string; parent: string }) {
    const title = test.fullTitle || `${test.parent} › ${test.title}`
    try {
      const logs = await drainConsoleProxy()
      if (!logs.length) return
      console.info(`\n[browser console] ${title} (${logs.length} entries)`)
      for (const l of logs) {
        console.info(`  [${l.level}] ${l.message}`)
      }
    } catch (err) {
      // Surface the failure so it isn't silently swallowed, without failing the test itself.
      console.info(`[browser console] ${title} — drain failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  },
}

export default baseConfig
