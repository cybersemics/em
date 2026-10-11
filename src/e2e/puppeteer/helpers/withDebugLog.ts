import { WindowEm } from '../../../initialize'
import { page } from '../session'

/**
 * Runs a test body with the app's Debug Log recording, and appends the log to the error if the body fails, so that a
 * flake which only fails in CI leaves a record of what the app did. The log lands in the failure message, which is
 * what the Puppeteer Flaky workflow uploads for a failed iteration. See docs/debug-log.md.
 *
 * Diagnostic environment control: logging is off in Puppeteer, and enabling it adds a little synchronous work to every
 * action and input event, which can shift the timing of a race. Wrap only the test under investigation, and remove the
 * wrapper once the flake is diagnosed. Needs no cleanup because every test runs in a fresh incognito context.
 */
const withDebugLog = async (f: () => Promise<void>): Promise<void> => {
  await page.evaluate(() => {
    const em = window.em as WindowEm
    em.debugLog.setEnabled(true)
    // drop the session marker and anything hydrated from storage
    em.debugLog.clear()
  })

  try {
    await f()
  } catch (e) {
    const log = await page
      .evaluate(() => {
        const em = window.em as WindowEm
        return em.debugLog.format(em.store.getState())
      })
      .catch((err: unknown) => `(debug log unavailable: ${err instanceof Error ? err.message : String(err)})`)
    if (e instanceof Error) {
      e.message = `${e.message}\n\n## Debug Log\n\n${log}`
    }
    throw e
  }
}

export default withDebugLog
