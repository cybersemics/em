import type { Page } from 'puppeteer'
import type { WindowEm } from '../../../initialize'

/** Waits for asynchronous thoughtspace and cursor initialization. */
const waitForAppReady = async (page: Page): Promise<void> => {
  await page.evaluate(() => (window.em as WindowEm).testHelpers.waitForInitialized())
}

export default waitForAppReady
