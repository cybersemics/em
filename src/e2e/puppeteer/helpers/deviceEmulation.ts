import { Device, Protocol } from 'puppeteer'
import { page } from '../session'

let activeDevice: Device | undefined

const deviceEmulation = {
  /** Emulates native safe-area insets through the browser, including CSS env() values. */
  async setSafeAreaInsets(insets: Protocol.Emulation.SafeAreaInsets): Promise<void> {
    const session = await page.createCDPSession()
    await session.send('Emulation.setSafeAreaInsetsOverride', { insets })
  },

  /** Returns the device selected for the next page setup. */
  get device(): Device | undefined {
    return activeDevice
  },

  /**
   * Selects a device before navigation for every test in the current suite.
   * Changing mobile or touch emulation after navigation may reload the page and restart app initialization.
   */
  useForSuite(device: Device): void {
    beforeAll(() => {
      activeDevice = device
    })

    afterAll(() => {
      activeDevice = undefined
    })
  },
}

export default deviceEmulation
