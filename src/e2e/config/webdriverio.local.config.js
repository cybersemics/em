/* Configuration to run tests on local using Appium.
 * After setup Appium, you can use this configuration in webdriverio-environment.js */
const config = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: 'iOS',
    platformVersion: '13.3',
    deviceName: 'iPhone 11',
    browserName: 'safari',
    maxInstances: 1, // Parallel test count
    automationName: 'XCUITest',
  },
}

module.exports = config
