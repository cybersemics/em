const HOST = process.env.APPIUM_HOST || '0.0.0.0'
const PORT = process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723

/**
 * Generate a webdriverio config with the given local identifier.
 */
const config = () => ({
  hostname: HOST,
  port: PORT,
  capabilities: {
    platformName: 'iOS',
    browserName: 'Safari',
    'appium:automationName': 'xcuitest',
    'appium:deviceName': 'iPhone 15 Plus', // The device that tests run on. iPhone 11 seems more stable for appium.
    'appium:osVersion': '18.3',
    'appium:platformVersion': '18.3',
    // unicodeKeyboard: true,
  },

  // logLevel: 'trace',
  baseUrl: '',
  waitforTimeout: 20000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 10,
})

export default config
