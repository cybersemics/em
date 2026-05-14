import { Device } from 'puppeteer'
import { page } from '../setup'
import waitForAppReady from './waitForAppReady'

/** Emulates a device and reloads so module-level device constants such as isTouch are initialized for that device. */
const emulate = async (device: Device) => {
  await page.emulate(device)
  await page.reload({ waitUntil: 'load' })
  await waitForAppReady(page)
}

export default emulate
