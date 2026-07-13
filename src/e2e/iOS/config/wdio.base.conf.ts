import https from 'https'
import path from 'path'
import { drainConsoleProxy, waitForConsoleProxy } from '../../../util/consoleProxy'
import resetApp from '../helpers/resetApp'

/**
 * Checks if the app is running on locally.
 * @throws Error if the app is not running.
 */
export const checkAppRunning = (): Promise<void> => {
  const errorMessage =
    'App is not running on https://localhost:3000. Please start the app locally before running tests.'
  return new Promise((resolve, reject) => {
    const req = https.get('https://localhost:3000', { timeout: 2000, rejectUnauthorized: false }, res => {
      res.on('data', () => {})
      res.on('end', () => resolve())
    })
    req.on('error', () => {
      reject(new Error(errorMessage))
    })
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(errorMessage))
    })
  })
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
    timeout: 90000,
  },

  // Hooks
  // Check if app is running before starting any workers (only in local development, not CI)
  // Reason: when app is not running, tests will run but fail with a timeout unnecessarily.
  // wdio.local.conf.ts always runs locally, so this check always runs for it.
  // wdio.browserstack.conf.ts can run locally or in CI, so we check !process.env.CI.
  onPrepare: async function () {
    if (!process.env.CI) {
      try {
        await checkAppRunning()
      } catch (error) {
        console.error(error instanceof Error ? error.message : 'App is not running on https://localhost:3000')
        process.exit(1)
      }
    }
  },

  // Navigate once at the start of the session.
  // CLOUDFLARED_URL: set by BrowserStack config (or CI) — a public HTTPS URL with a trusted cert.
  // localhost: used for local Appium testing.
  before: async function () {
    const baseUrl = process.env.CLOUDFLARED_URL || 'https://localhost:3000'
    await browser.url(baseUrl)

    await browser.waitUntil(
      async () => {
        const body = await browser.$('body')
        return body.isExisting()
      },
      { timeout: 30000 },
    )
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
