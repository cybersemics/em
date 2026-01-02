import baseConfig from './wdio.base.conf.js'

const HOST = process.env.APPIUM_HOST || '127.0.0.1'
const PORT = process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723

/**
 * WDIO configuration for local Appium testing.
 * Use this ONLY if you want to test with a local iOS Simulator.
 *
 * Alternative: Use BrowserStack instead (yarn test:ios:browserstack) - no local setup needed.
 * BrowserStack can test your localhost app via secure tunnel - see wdio.browserstack.conf.ts.
 *
 * Prerequisites:
 * 1. Install Appium: npm install -g appium.
 * 2. Install XCUITest driver: appium driver install xcuitest.
 * 3. Start Appium: appium.
 * 4. Start the app: yarn start (on port 3000).
 *
 * Run: yarn test:ios:local.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,

  // Runner Configuration
  hostname: HOST,
  port: PORT,
  path: '/',

  // Capabilities
  capabilities: [
    {
      platformName: 'iOS',
      browserName: 'Safari',
      'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15 Plus',
      'appium:platformVersion': process.env.IOS_PLATFORM_VERSION || '18.3',
      'appium:automationName': 'XCUITest',
      'appium:newCommandTimeout': 240,
    },
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
