import type { WindowEm } from '../../../initialize'
import { page } from '../setup'

/** Waits for TreeCRDT persistence and React's post-paint focus/selection effects after an e2e action. */
const waitForEmIdle = async (): Promise<void> => {
  await page.evaluate(async () => {
    /** Flushes React post-paint effects and macrotasks that can enqueue TreeCRDT persistence work. */
    const waitForBrowserSettled = async (): Promise<void> => {
      await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
      await new Promise(resolve => setTimeout(resolve))
    }

    const em = window.em as Partial<WindowEm> | undefined
    // Two passes are intentional: React effects can enqueue persistence after the first idle wait.
    await waitForBrowserSettled()
    await em?.testHelpers?.waitForTreecrdtIdle?.()
    await waitForBrowserSettled()
    await em?.testHelpers?.waitForTreecrdtIdle?.()
    await waitForBrowserSettled()
  })
}

export default waitForEmIdle
