import { Device } from 'puppeteer'
import { page } from '../session'

/** Holds down a key on the keyboad. */
const emulate = async (device: Device) => page.emulate(device)

export default emulate
