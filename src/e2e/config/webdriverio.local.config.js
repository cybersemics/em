/* Configuration to run tests on local using Appium.
 * After setup Appium, you can use this configuration in webdriverio-environment.js */
const config = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: 'iOS',
    platformVersion: '14.5',
    deviceName: 'iPhone 12 Pro Max',
    browserName: 'Safari',
  },
}

module.exports = config
