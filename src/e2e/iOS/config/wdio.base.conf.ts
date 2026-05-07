import http from 'http'
import path from 'path'

/**
 * Checks if the app is running on locally.
 * @throws Error if the app is not running.
 */
export const checkAppRunning = (): Promise<void> => {
  const errorMessage = 'App is not running on http://localhost:3000. Please start the app locally before running tests.'
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000', { timeout: 2000 }, res => {
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
  // Each spec file runs in its own parallel session
  maxInstances: 3,

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
        console.error(error instanceof Error ? error.message : 'App is not running on http://localhost:3000')
        process.exit(1)
      }
    }
  },

  // Navigate once at the start of the session
  before: async function () {
    await browser.url('http://bs-local.com:3000')
    await browser.waitUntil(
      async () => {
        const body = await browser.$('body')
        return body.isExisting()
      },
      { timeout: 30000 },
    )
  },

  // Before each test: clear storage and refresh (faster than full navigation)
  beforeTest: async function () {
    // Clear localStorage and sessionStorage to ensure fresh state
    await browser.execute(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Refresh to apply the cleared storage (much faster than full navigation)
    await browser.refresh()

    // Install in-page console proxy. getLogs('safariConsole') returned nothing on this BrowserStack/Appium stack despite appium:showSafariConsoleLog being set, so we capture browser-side logs into window.__capturedLogs__ for the afterTest hook to drain.
    await browser.execute(() => {
      const w = window as Window & { __capturedLogs__?: { level: string; message: string }[] }
      const logs: { level: string; message: string }[] = []
      w.__capturedLogs__ = logs
      const c = console as unknown as Record<string, (...args: unknown[]) => void>
      for (const method of ['log', 'warn', 'error', 'info', 'debug']) {
        const orig = c[method].bind(console)
        c[method] = (...args: unknown[]) => {
          try {
            const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
            logs.push({ level: method, message })
          } catch {
            // Serialization failure (e.g. circular refs) — drop this entry rather than fail the test.
          }
          orig(...args)
        }
      }
    })

    // TEMP canary: emit a recognisable browser-side console.info so the afterTest hook has something to drain even when a test produces no app logs. Remove once console-proxy capture is verified in CI.
    await browser.execute(() => console.info('SAFARI_CONSOLE_CANARY: beforeTest reached'))

    // Wait for the tutorial skip button and click it
    const skipElement = await $('#skip-tutorial')
    await skipElement.waitForExist({ timeout: 90000 })
    await skipElement.waitForClickable({ timeout: 10000 })
    await skipElement.click()

    // Wait for the empty thoughtspace to be ready
    const emptyThoughtspace = await $('[aria-label="empty-thoughtspace"]')
    await emptyThoughtspace.waitForExist({ timeout: 90000 })
  },

  // After each test: drain window.__capturedLogs__ and print it under the test title so browser-side console output is grouped per-it() in CI logs.
  afterTest: async function (test: { fullTitle: string; title: string; parent: string }) {
    const title = test.fullTitle || `${test.parent} › ${test.title}`
    try {
      const result = await browser.execute(() => {
        const w = window as Window & { __capturedLogs__?: { level: string; message: string }[] }
        const collected = w.__capturedLogs__ ?? []
        const proxyInstalled = '__capturedLogs__' in w
        w.__capturedLogs__ = []
        return { logs: collected, proxyInstalled, href: location.href }
      })
      console.info(
        `\n[browser console] ${title} — drained ${result.logs.length} entries (proxy installed: ${result.proxyInstalled}, url: ${result.href})`,
      )
      for (const l of result.logs) {
        console.info(`  [${l.level}] ${l.message}`)
      }
    } catch (err) {
      // Diagnostic: surface the failure so we can see why drain failed for specific tests, without failing the test itself.
      console.info(`[browser console] ${title} — drain failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  },
}

export default baseConfig
