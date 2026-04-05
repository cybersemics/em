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

// In CI, cloudflared provides a public HTTPS URL with a trusted cert,
// so the BrowserStack Local tunnel is not needed.
const useCloudflared = !!process.env.CLOUDFLARED_URL

/**
 * WDIO configuration for BrowserStack iOS testing.
 *
 * In CI: Uses cloudflared tunnel for HTTPS with a trusted cert (no BrowserStack Local needed).
 * Locally: Uses BrowserStack Local tunnel to connect to the dev server.
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
        // BrowserStack Local tunnel is only needed when not using cloudflared.
        local: !useCloudflared,
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
        // Only start BrowserStack Local tunnel when not using cloudflared.
        browserstackLocal: !useCloudflared,
        testObservability: true,
        ...(useCloudflared
          ? {}
          : {
              opts: {
                verbose: true,
                forceLocal: true,
                logFile: 'browserstack.log',
              },
            }),
      },
    ],
  ],
}

export default config
