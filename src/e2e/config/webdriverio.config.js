if (!process.env.BROWSERSTACK_USERNAME) {
  throw new Error('process.env.BROWSERSTACK_USERNAME not defined')
} else if (!process.env.BROWSERSTACK_ACCESS_KEY) {
  throw new Error('process.env.BROWSERSTACK_ACCESS_KEY not defined')
}

const user = process.env.BROWSERSTACK_USERNAME

const config = {
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  capabilities: {
    platformName: 'iOS',
    platformVersion: '14.4',
    deviceName: 'iPhone 12',
    browserName: 'Safari',
    unicodeKeyboard: true,
    build: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${new Date().toISOString().slice(0, 10)}`,
    project: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
    'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'local-' + new Date().getTime(),
    'browserstack.local': 'true',
    'browserstack.idleTimeout': 30,
  },

  logLevel: 'warn',
  baseUrl: '',
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  hostname: 'hub.browserstack.com',
}

module.exports = config
