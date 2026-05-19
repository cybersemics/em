import { Device } from 'puppeteer'
import { page } from '../setup'
import waitForEmIdle from './waitForEmIdle'

/** Holds down a key on the keyboad. */
const emulate = async (device: Device) => {
  await page.emulate(device)
  await waitForEmIdle()
}

export default emulate
