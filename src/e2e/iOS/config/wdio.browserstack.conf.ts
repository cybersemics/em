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
      ...baseConfig.baseCapabilities,
      'appium:deviceName': 'iPhone 15 Plus',
      'appium:platformVersion': '17',
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
}

export default config
