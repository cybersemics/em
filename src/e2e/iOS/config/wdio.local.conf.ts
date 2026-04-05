import { execSync } from 'child_process'
import path from 'path'
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

  // Install the dev server's self-signed cert into the iOS Simulator's trust store
  // so Safari treats HTTPS as fully trusted (no localStorage/sessionStorage restrictions).
  // Runs after Appium boots the simulator, before navigating to the app.
  before: async function () {
    const certPath = path.resolve(process.cwd(), 'node_modules/.vite/basic-ssl/_cert.pem')
    try {
      execSync(`xcrun simctl keychain booted add-root-cert ${certPath}`, { stdio: 'pipe' })
    } catch {
      console.warn('Could not install cert in simulator.')
    }

    // Call base before hook (navigates to the app)
    await baseConfig.before()
  },

  // Runner Configuration
  hostname: HOST,
  port: PORT,
  path: '/',

  // Capabilities
  capabilities: [
    {
      ...baseConfig.baseCapabilities,
      'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15 Plus',
      'appium:platformVersion': process.env.IOS_PLATFORM_VERSION || '18.3',
      'appium:newCommandTimeout': 240,
    },
  ],
}

export default config
