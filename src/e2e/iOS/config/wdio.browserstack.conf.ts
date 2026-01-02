import dotenv from 'dotenv'
import path from 'path'
import baseConfig from './wdio.base.conf.js'

// Load .env.test.local before checking env vars since this file is imported
// at module load time, before vitest's automatic env loading kicks in
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

// Validate environment variables
if (!process.env.BROWSERSTACK_USERNAME) {
  throw new Error('process.env.BROWSERSTACK_USERNAME not defined')
}
if (!process.env.BROWSERSTACK_ACCESS_KEY) {
  throw new Error('process.env.BROWSERSTACK_ACCESS_KEY not defined')
}

const user = process.env.BROWSERSTACK_USERNAME
const date = new Date().toISOString().slice(0, 10)

/**
 * WDIO configuration for BrowserStack iOS testing.
 * Uses @wdio/browserstack-service for automatic tunnel management.
 *
 * Prerequisites:
 * 1. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY env vars.
 * 2. Start the app: yarn start (on port 3000).
 *
 * Run: yarn test:ios:browserstack.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,

  // BrowserStack Configuration
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  // Capabilities
  capabilities: [
    {
      platformName: 'iOS',
      browserName: 'Safari',
      'appium:deviceName': 'iPhone 15 Plus',
      'appium:platformVersion': '17',
      'appium:automationName': 'XCUITest',
      'bstack:options': {
        deviceName: 'iPhone 15 Plus',
        osVersion: '17',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
        sessionName: 'iOS Safari Tests',
        local: true,
        debug: true,
        networkLogs: true,
        consoleLogs: 'verbose',
        idleTimeout: 60,
      },
    },
  ],

  // Services
  services: [
    [
      'browserstack',
      {
        browserstackLocal: true,
        testObservability: true,
        opts: {
          verbose: true,
          forceLocal: true,
          logFile: 'browserstack.log',
        },
      },
    ],
  ],

  // Hooks
  // Navigate once at the start of the session
  before: async function () {
    await browser.url('http://bs-local.com:3000')
    await browser.waitUntil(
      async () => {
        const body = await browser.$('body')
        return await body.isExisting()
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

export default config
