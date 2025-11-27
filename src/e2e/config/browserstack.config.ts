import dotenv from 'dotenv'
import path from 'path'

// Load .env.test.local before checking env vars since this file is imported
// at module load time, before vitest's automatic env loading kicks in
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

if (!process.env.BROWSERSTACK_USERNAME) {
  throw new Error('process.env.BROWSERSTACK_USERNAME not defined')
} else if (!process.env.BROWSERSTACK_ACCESS_KEY) {
  throw new Error('process.env.BROWSERSTACK_ACCESS_KEY not defined')
}

const user = process.env.BROWSERSTACK_USERNAME

/**
 * Generate a webdriverio config with the given local identifier.
 */
const config = (localIdentifier: string) => ({
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY as string,
  localIdentifier,
  capabilities: {
    platformName: 'iOS',
    browserName: 'Safari',
    device: 'iPhone 15 Plus', // The device that tests run on. iPhone 11 seems more stable for appium.
    osVersion: '17',
    unicodeKeyboard: true,
    build: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${new Date().toISOString().slice(0, 10)}`,
    project: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
    'browserstack.localIdentifier': localIdentifier,
    'browserstack.local': true,
    'browserstack.idleTimeout': 60,
    'browserstack.debug': 'true',
    'browserstack.console': 'verbose',
    'browserstack.networkLogs': 'true',
  },

  // logLevel: 'trace',
  baseUrl: '',
  waitforTimeout: 20000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 10,
  hostname: 'hub.browserstack.com',
})

export type BrowserStackConfig = ReturnType<typeof config>

export default config
