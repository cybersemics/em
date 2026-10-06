import path from 'path'
import browserStackConfig from '../../iOS/config/wdio.browserstack.conf'

/**
 * Runs the Android Chrome smoke suite using the shared BrowserStack tunnel, slot wait, and browser lifecycle.
 */
export const config: WebdriverIO.Config = {
  ...browserStackConfig,
  specs: [path.resolve(process.cwd(), 'src/e2e/android/__tests__/**/*.ts')],
  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      browserName: 'Chrome',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Google Pixel 8',
      'appium:platformVersion': '14.0',
      'bstack:options': {
        deviceName: 'Google Pixel 8',
        osVersion: '14.0',
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName:
          process.env.BROWSERSTACK_BUILD_NAME ||
          `Local - ${process.env.BROWSERSTACK_USERNAME} - ${new Date().toISOString().slice(0, 10)}`,
        sessionName: 'Android Chrome Tests',
        debug: false,
        networkLogs: false,
        consoleLogs: 'info',
        idleTimeout: 60,
      },
    },
  ],
  services: [['browserstack', { testObservability: true }]],
}

export default config
