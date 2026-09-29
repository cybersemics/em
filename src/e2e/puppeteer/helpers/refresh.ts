import { page } from '../session'
import waitForThoughtspaceIdle from './waitForThoughtspaceIdle'

/** Reloads the page and waits for the thoughtspace to load. Every queued persistence write is committed before the reload, so a test that reloads right after a paste does not need to wait for persistence itself. Typed text reaches the queue only when its edit throttle flushes; run a command first (for example `press('Escape')`) to commit it before reloading. */
const refresh = async (): Promise<void> => {
  await waitForThoughtspaceIdle()
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())
}

export default refresh
