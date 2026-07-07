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

// The #4394 caret focus regression only reproduces on iOS 18's Safari touch-adjustment heuristic, so
// that single spec runs on an iOS 18 device while the rest of the suite stays on the default iOS 17.
const caretFocusSpec = path.resolve(process.cwd(), 'src/e2e/iOS/__tests__/caretFocus.ts')

// Isolated-primitive diagnostic for the same #4394 heuristic (hypothesis H2); also requires iOS 18.
const caretFocusIsolatedSpec = path.resolve(process.cwd(), 'src/e2e/iOS/__tests__/caretFocusIsolated.ts')

const bstackOptions = {
  projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
  buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
  local: true,
  debug: true,
  networkLogs: true,
  consoleLogs: 'verbose',
  idleTimeout: 60,
}

// Run the whole suite except the #4394 regression on the default device.
const suiteCapability = {
  ...baseConfig.baseCapabilities,
  exclude: [caretFocusSpec, caretFocusIsolatedSpec],
  'appium:deviceName': 'iPhone 15 Plus',
  'appium:platformVersion': '17',
  'bstack:options': {
    ...bstackOptions,
    deviceName: 'iPhone 15 Plus',
    osVersion: '17',
    sessionName: 'iOS Safari Tests',
  },
}

// Run only the #4394 regression, which requires iOS 18 to reproduce.
const caretFocusCapability = {
  ...baseConfig.baseCapabilities,
  specs: [caretFocusSpec, caretFocusIsolatedSpec],
  'appium:deviceName': 'iPhone 16 Pro Max',
  'appium:platformVersion': '18',
  'bstack:options': {
    ...bstackOptions,
    deviceName: 'iPhone 16 Pro Max',
    osVersion: '18',
    sessionName: 'iOS Safari Tests (iOS 18)',
  },
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
export const config: WebdriverIO.Config = {
  ...baseConfig,

  // BrowserStack Configuration
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  // Capabilities (per-capability specs/exclude is a WDIO runtime feature not covered by the strict type)
  capabilities: [suiteCapability, caretFocusCapability] as WebdriverIO.Config['capabilities'],

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
