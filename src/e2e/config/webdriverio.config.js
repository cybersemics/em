const user = process.env.BROWSERSTACK_USERNAME || 'username'

const config = {
  user: user,
  key: process.env.BROWSERSTACK_ACCESS_KEY || 'access_key',

  capabilities: {
    platformName: 'iOS',
    platformVersion: '14.4',
    deviceName: 'iPhone 12',
    browserName: 'Safari',
    unicodeKeyboard: true,
    build: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user}`,
    project: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
    'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'local-' + new Date().getTime(),
    'browserstack.local': 'true',

  },

  logLevel: 'warn',
  baseUrl: '',
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  hostname: 'hub.browserstack.com',
}

module.exports = config
