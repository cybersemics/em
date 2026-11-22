import { page } from '../session'
import waitForThoughtspaceIdle from './waitForThoughtspaceIdle'

interface Options {
  /**
   * Reload at once, without waiting for queued persistence writes, as a user's refresh does. Use it to interrupt work
   * that is still writing, such as an import. The thoughtspace is not idle until such work finishes, so a refresh that
   * waits for idle lands after it. Writes still in flight are lost, so assert only what the app should recover.
   */
  immediate?: boolean
}

/** Reloads the page and waits for the thoughtspace to load. Every queued persistence write is committed before the reload, so a test that reloads right after a paste does not need to wait for persistence itself. Typed text reaches the queue only when its edit throttle flushes; run a command first (for example `press('Escape')`) to commit it before reloading. */
const refresh = async ({ immediate }: Options = {}): Promise<void> => {
  if (!immediate) await waitForThoughtspaceIdle()
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
}

export default refresh
