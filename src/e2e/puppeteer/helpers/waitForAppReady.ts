import type { Page } from 'puppeteer'
import type { WindowEm } from '../../../initialize'

/** Waits until the app has exposed test helpers and completed initialization. */
const waitForAppReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => typeof (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForInitialized === 'function',
  )
  await page.evaluate(async () => {
    await (window.em as WindowEm).testHelpers.waitForInitialized()
  })
}

export default waitForAppReady
