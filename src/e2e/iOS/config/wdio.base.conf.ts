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

  // Navigate once at the start of the session.
  // ?__ios_console_proxy activates the iOS console proxy installed by src/util/iOSConsoleProxy.ts.
  before: async function () {
    await browser.url('http://bs-local.com:3000?__ios_console_proxy')
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

    // TEMP canary: emit a recognisable browser-side console.info so the afterTest hook has something to drain even when a test produces no app logs. Remove once iOS console proxy capture is verified in CI.
    await browser.execute(() => console.info('IOS_CONSOLE_PROXY_CANARY: beforeTest reached'))

    // Wait for the tutorial skip button and click it
    const skipElement = await $('#skip-tutorial')
    await skipElement.waitForExist({ timeout: 90000 })
    await skipElement.waitForClickable({ timeout: 10000 })
    await skipElement.click()

    // Wait for the empty thoughtspace to be ready
    const emptyThoughtspace = await $('[aria-label="empty-thoughtspace"]')
    await emptyThoughtspace.waitForExist({ timeout: 90000 })
  },

  // After each test: drain the iOS console proxy buffer and print it under the test title so browser-side console output is grouped per-it() in CI logs.
  afterTest: async function (test: { fullTitle: string; title: string; parent: string }) {
    const title = test.fullTitle || `${test.parent} › ${test.title}`
    try {
      const result = await browser.execute(() => {
        const collected = window.__drainiOSConsoleLogs__?.() ?? []
        const proxyInstalled = typeof window.__drainiOSConsoleLogs__ === 'function'
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
