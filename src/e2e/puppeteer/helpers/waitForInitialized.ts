import { page } from '../session'

/**
 * Waits for background initialization when a test specifically depends on loading persisted state.
 * Do not use this as a general UI-readiness barrier: fresh-page tests must exercise interaction while
 * the database is still initializing. Prefer a waiter for the expected visible content or cursor.
 */
const waitForInitialized = async (): Promise<void> => {
  // The bundle exposes window.em while it evaluates; wait for it in the page in case the load event fired first.
  await page.waitForFunction(() => !!window.em?.testHelpers?.waitForInitialized)
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
}

export default waitForInitialized
