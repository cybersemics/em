import type { Page } from 'puppeteer'
import type { WindowEm } from '../../../initialize'

/** Waits until the app has exposed test helpers and completed initialization. */
const waitForAppReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(async () => {
    const waitForInitialized = (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForInitialized

    if (typeof waitForInitialized !== 'function') return false

    await waitForInitialized()
    return true
  })
}

export default waitForAppReady
