import type { Page } from 'puppeteer'
import type { WindowEm } from '../../../initialize'

/**
 * Waits for app module evaluation and initialization.
 *
 * The production bundle initializes TreeCRDT WASM with top-level await, so the load event may fire before window.em is attached.
 */
const waitForAppReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(async () => {
    const waitForInitialized = (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForInitialized

    if (typeof waitForInitialized !== 'function') return false

    await waitForInitialized()
    return true
  })
}

export default waitForAppReady
