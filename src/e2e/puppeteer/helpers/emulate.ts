import { Device } from 'puppeteer'
import { page } from '../setup'

/** Holds down a key on the keyboad. */
const emulate = async (device: Device) => page.emulate(device)

export default emulate
