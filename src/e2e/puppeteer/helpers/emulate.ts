import { Device, Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Holds down a key on the keyboad. */
const emulate = async (device: Device) => await global.page.emulate(device)

export default emulate
