import { Device } from 'puppeteer'
import { page } from '../session'
import waitForBrowserSettled from './waitForBrowserSettled'

/**
 * Emulates a device after the app is already mounted. Prefer `deviceEmulation.useForSuite`, which emulates before navigation.
 */
const emulate = async (device: Device) => {
  await page.emulate(device)
  // Changing mobile or touch emulation reloads the page, which restarts app initialization. Wait for it to finish, otherwise initializeCursor's final setCursor lands after the test has acted and clears the cursor.
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
  // Emulation changes viewport, touch, and media state. Wait for layout/effects before gestures or snapshots.
  await waitForBrowserSettled()
}

export default emulate
