import path from 'path'

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

  // Test Configurations
  logLevel: 'info' as const,
  bail: 0,
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Framework Configuration
  framework: 'mocha' as const,
  mochaOpts: {
    ui: 'bdd' as const,
    timeout: 90000,
  },

  // Hooks
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

    // Wait for the tutorial skip button and click it
    const skipElement = await $('#skip-tutorial')
    await skipElement.waitForExist({ timeout: 90000 })
    await skipElement.waitForClickable({ timeout: 10000 })
    await skipElement.click()

    // Wait for the empty thoughtspace to be ready
    const emptyThoughtspace = await $('[aria-label="empty-thoughtspace"]')
    await emptyThoughtspace.waitForExist({ timeout: 90000 })
  },
}

export default baseConfig
