import { Device } from 'puppeteer'
import { page } from '../setup'
import waitForBrowserSettled from './waitForBrowserSettled'

/** Emulates a device after the app is already mounted. */
const emulate = async (device: Device) => {
  await page.emulate(device)
  // Emulation changes viewport, touch, and media state. Wait for layout/effects before gestures or snapshots.
  await waitForBrowserSettled()
}

export default emulate
