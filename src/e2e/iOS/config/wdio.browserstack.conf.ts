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
 * Uses BrowserStack Local to tunnel traffic privately between CI and BrowserStack
 * devices. The networkLogs capability causes BrowserStack to set up an mitmproxy
 * that installs trusted certs on the device, giving Safari a secure context
 * (enabling localStorage, sessionStorage, SubtleCrypto, etc.) even though the
 * local dev server uses a self-signed cert.
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
      ...baseConfig.baseCapabilities,
      'appium:deviceName': 'iPhone 15 Plus',
      'appium:platformVersion': '17',
      'bstack:options': {
        deviceName: 'iPhone 15 Plus',
        osVersion: '17',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
        sessionName: 'iOS Safari Tests',
        debug: true,
        networkLogs: true,
        consoleLogs: 'verbose',
        idleTimeout: 60,
      },
    },
  ],

  // Services — BrowserStack Local creates a private tunnel (no public exposure)
  services: [
    [
      'browserstack',
      {
        browserstackLocal: true,
        opts: {
          forceLocal: 'true',
        },
        testObservability: true,
      },
    ],
  ],

  onPrepare: async function () {
    // Tell base config to navigate to bs-local.com (BrowserStack Local resolves this to localhost)
    process.env.BS_LOCAL_URL = 'https://bs-local.com:3000'
    await baseConfig.onPrepare()
  },
}

export default config
