import { page } from '../session'
import waitForThoughtspaceIdle from './waitForThoughtspaceIdle'

/**
 * Flushes pending persistence, reloads the page, and waits for the app shell to render. Every queued persistence write
 * is committed before the reload, so a test that reloads right after a paste does not need to wait for persistence
 * itself. Typed text reaches the queue only when its edit throttle flushes; run a command first (for example
 * `press('Escape')`) to commit it before reloading. The reloaded page is ready when `#content` mounts, which happens
 * once the tab has acquired thoughtspace access; the thoughtspace opens and hydrates after that, so a caller waits for
 * the thought it needs with `waitForEditable`.
 */
const refresh = async (): Promise<void> => {
  await waitForThoughtspaceIdle()
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('#content')
}

export default refresh
