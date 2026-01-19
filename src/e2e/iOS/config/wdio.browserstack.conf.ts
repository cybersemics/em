import dotenv from 'dotenv'
import path from 'path'
import baseConfig from './wdio.base.conf.js'

// Load .env.test.local only in local development, not in CI
// In CI, environment variables should be set via GitHub Actions secrets
if (!process.env.CI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

  // Validate environment variables only in local development
  // In CI, secrets are set by GitHub Actions and will be available when WebdriverIO runs
  if (!process.env.BROWSERSTACK_USERNAME) {
    throw new Error(
      'process.env.BROWSERSTACK_USERNAME not defined. Set it in .env.test.local or as an environment variable.',
    )
  }
  if (!process.env.BROWSERSTACK_ACCESS_KEY) {
    throw new Error(
      'process.env.BROWSERSTACK_ACCESS_KEY not defined. Set it in .env.test.local or as an environment variable.',
    )
  }
}

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

// Log BrowserStack credentials for debugging (mask key for security)
const username = process.env.BROWSERSTACK_USERNAME
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY

// Debug: Log all relevant environment variables
console.info('[BrowserStack Config] CI:', process.env.CI)
console.info('[BrowserStack Config] All BROWSERSTACK_* env vars:', {
  BROWSERSTACK_USERNAME: username ? `${username.substring(0, 2)}...` : 'undefined',
  BROWSERSTACK_ACCESS_KEY: accessKey ? 'defined' : 'undefined',
  BROWSERSTACK_PROJECT_NAME: process.env.BROWSERSTACK_PROJECT_NAME || 'undefined',
  BROWSERSTACK_BUILD_NAME: process.env.BROWSERSTACK_BUILD_NAME || 'undefined',
})

const maskedKey = accessKey
  ? `${accessKey.substring(0, 4)}...${accessKey.substring(accessKey.length - 4)}`
  : 'undefined'

console.info('[BrowserStack Config] Username:', username || 'undefined')
console.info('[BrowserStack Config] Access Key:', maskedKey)
console.info('[BrowserStack Config] Project:', process.env.BROWSERSTACK_PROJECT_NAME || 'em')
console.info('[BrowserStack Config] Build Name:', process.env.BROWSERSTACK_BUILD_NAME || 'not set')

export const config: WebdriverIO.Config = {
  ...baseConfig,

  // BrowserStack Configuration
  // Use env vars directly to ensure they're read at runtime, not module load time
  user: username,
  key: accessKey,

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
        buildName:
          process.env.BROWSERSTACK_BUILD_NAME ||
          `Local - ${process.env.BROWSERSTACK_USERNAME || 'unknown'} - ${new Date().toISOString().slice(0, 10)}`,
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

export default config
