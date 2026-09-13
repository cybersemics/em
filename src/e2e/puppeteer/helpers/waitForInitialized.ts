import { page } from '../session'

/**
 * Waits until app initialization has finished: the thoughtspace runtime is ready and startup has restored the cursor
 * from the URL. The app is interactive before that point. The welcome modal renders from initial state while
 * `initialize()` is still running, so neither its appearance nor its dismissal means the app has finished starting.
 * Initialization ends with `initializeCursor`, which sets the cursor from the URL; a test that has already created a
 * thought, focused a note, or selected thoughts by then has that state overwritten. Startup has no visual signal, so
 * this is a sanctioned backdoor for synchronization only: call it after navigation or reload, never as an assertion.
 */
const waitForInitialized = async (): Promise<void> => {
  // The bundle exposes window.em while it evaluates; wait for it in the page in case the load event fired first.
  await page.waitForFunction(() => !!window.em?.testHelpers?.waitForInitialized)
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
}

export default waitForInitialized
