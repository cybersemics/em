if (!process.env.BROWSERSTACK_USERNAME) {
  throw new Error('process.env.BROWSERSTACK_USERNAME not defined')
} else if (!process.env.BROWSERSTACK_ACCESS_KEY) {
  throw new Error('process.env.BROWSERSTACK_ACCESS_KEY not defined')
}

const user = process.env.BROWSERSTACK_USERNAME

/**
 * Generate a webdriverio config with the given local identifier.
 */
const config = localIdentifier => ({
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  capabilities: {
    platformName: 'iOS',
    browserName: 'Safari',
    device: 'iPhone 11', // The device that tests run on. iPhone 11 seems more stable for appium.
    osVersion: '13.3',
    unicodeKeyboard: true,
    build: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${new Date().toISOString().slice(0, 10)}`,
    project: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
    'browserstack.localIdentifier': localIdentifier,
    'browserstack.local': true,
    'browserstack.idleTimeout': 30,
    // 'browserstack.debug': 'true',
    // 'browserstack.console': 'verbose',
    // 'browserstack.networkLogs': 'true',
  },

  // logLevel: 'trace',
  baseUrl: '',
  waitforTimeout: 20000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 10,
  hostname: 'hub.browserstack.com',
})

module.exports = config
