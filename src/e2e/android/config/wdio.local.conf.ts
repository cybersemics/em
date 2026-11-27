import path from 'path'
import baseConfig from '../../iOS/config/wdio.base.conf.js'

const HOST = process.env.APPIUM_HOST || '127.0.0.1'
const PORT = process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723

/**
 * WDIO configuration for running the Android suite in Chrome on a physical device over USB, through a local Appium.
 * Use it to develop an Android test against a device you can watch; CI runs the suite on BrowserStack
 * (wdio.browserstack.conf.ts).
 *
 * Prerequisites:
 * 1. Install Appium and its Android driver: npm install -g appium, then appium driver install uiautomator2.
 * 2. Start Appium so that it may fetch the chromedriver that matches the device's Chrome:
 * appium --allow-insecure uiautomator2:chromedriver_autodownload.
 * 3. Connect the device with USB debugging enabled. Set ANDROID_UDID when more than one device is attached.
 * 4. Serve the app to the device. Chrome on the device does not trust the dev server's self-signed certificate, so
 * serve plain HTTP and forward the port: HTTP=1 yarn start, then adb reverse tcp:3000 tcp:3000, and run with
 * CLOUDFLARED_URL=http://localhost:3000, which the base config loads in place of https://localhost:3000.
 *
 * Run: yarn test:android:local.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,

  hostname: HOST,
  port: PORT,
  path: '/',

  specs: [path.resolve(process.cwd(), 'src/e2e/android/__tests__/**/*.ts')],
  maxInstances: 1,

  // The retries in the base config wait out BrowserStack's parallel pool. A local device has no pool, and a retried
  // failure only hides what happened on the device.
  specFileRetries: 0,

  capabilities: [
    {
      platformName: 'Android',
      browserName: 'Chrome',
      'appium:automationName': 'UiAutomator2',
      ...(process.env.ANDROID_UDID ? { 'appium:udid': process.env.ANDROID_UDID } : null),
      'appium:newCommandTimeout': 240,
      // Chromedriver clears Chrome's app data before it launches Chrome — every tab, cookie and sign-in — unless it is
      // told to keep it, and Appium resets the app unless told not to. Even so, a session restarts Chrome when it
      // starts and closes Chrome's tabs when it ends, so do not run it against a Chrome whose tabs matter.
      'appium:noReset': true,
      // UiAutomator2 passes appium:chromeOptions on to chromedriver.
      'appium:chromeOptions': { androidKeepAppDataDir: true },
    },
  ],
}

export default config
