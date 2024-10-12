import { Device } from 'puppeteer'
import { fetchPage } from './setup'

/** Holds down a key on the keyboad. */
const emulate = async (device: Device) => await fetchPage().emulate(device)

export default emulate
