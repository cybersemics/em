import dotenv from 'dotenv'
import path from 'path'
import browserStackLauncherHooks from '../../iOS/config/browserStackLauncherHooks'
import baseConfig from '../../iOS/config/wdio.base.conf.js'

// Load .env.test.local before checking env vars since this file is imported at module load time.
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
 * WDIO configuration for BrowserStack Android Chrome testing.
 * Shares everything but the device with the iOS suite (src/e2e/iOS/config): the same Cloudflare tunnel pool,
 * BrowserStack slot wait, launcher hooks, retry policy, and per-test reset. Only the specs, the worker count, and
 * the capabilities differ. Prerequisites are those of the iOS BrowserStack config.
 *
 * Run: yarn test:android:browserstack.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,
  // onPrepare (dev-server probe, slot wait, tunnel claim, origin check) and onComplete (kill the connector).
  ...browserStackLauncherHooks,

  // BrowserStack Configuration
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  specs: [path.resolve(process.cwd(), 'src/e2e/android/__tests__/**/*.ts')],

  // One spec file, so one worker. This is also how many sessions browserStackLauncherHooks waits for, so an Android
  // run takes one of the account's parallels rather than reserving two and using one.
  maxInstances: 1,

  // Capabilities
  capabilities: [
    {
      platformName: 'Android',
      browserName: 'Chrome',
      'appium:automationName': 'UiAutomator2',
      // Stock Chrome and GBoard, with no OEM keyboard between the test and the VirtualKeyboard API the app relies on
      // (src/device/virtual-keyboard/handlers/androidWebHandler.ts). Android 14 has the deepest device inventory on the
      // account, which keeps queueing short.
      'appium:deviceName': 'Google Pixel 8',
      'appium:platformVersion': '14.0',
      'bstack:options': {
        deviceName: 'Google Pixel 8',
        osVersion: '14.0',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
        sessionName: 'Android Chrome Tests',
        // The device reaches the dev server over the public cloudflared HTTPS URL (onPrepare), so BrowserStack Local
        // (`local: true`) is not used on this path.
        debug: false,
        networkLogs: false,
        // Unlike iOS, BrowserStack can read Chrome's console on Android, so the dashboard log is usable for
        // diagnosing a failed run without the console proxy the iOS suite needs (VITE_BROWSER_CONSOLE_CAPTURE is
        // left unset, which makes the inherited proxy hooks no-ops).
        consoleLogs: 'info',
        idleTimeout: 60,
      },
    },
  ],

  // Services
  services: [
    [
      'browserstack',
      {
        testObservability: true,
      },
    ],
  ],
}

export default config
