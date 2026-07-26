import { page } from '../session'

/**
 * Reload with production startup timing so interactions during the loading phase can be tested.
 *
 * The app zeroes its animation durations when navigator.webdriver is present, which makes loading
 * states too short-lived to interact with. This helper spoofs navigator.webdriver to false and
 * reloads, restoring production timing for the remainder of the test. It is an arrange-phase
 * backdoor: use it only for a state that cannot exist under test timing, and still wait on named
 * conditions rather than production durations.
 *
 * The spoof needs no explicit cleanup: every test runs in a fresh incognito context and page, so
 * it cannot leak into other tests.
 */
const reloadWithProductionTiming = async () => {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

export default reloadWithProductionTiming
