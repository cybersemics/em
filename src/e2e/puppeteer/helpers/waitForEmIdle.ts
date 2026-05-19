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

    /** Waits for the editable for the current cursor to mount before the next e2e action sends input. */
    const waitForCursorEditableMounted = async (): Promise<void> => {
      const em = window.em as Partial<WindowEm> | undefined
      const cursor = em?.testHelpers?.getState?.().cursor
      if (!cursor) return

      const selector = '[data-editing=true] [data-editable], [data-editable][data-editing=true]'
      for (let i = 0; i < 120; i++) {
        if (document.querySelector(selector)) return
        await new Promise(requestAnimationFrame)
      }
    }

    const em = window.em as Partial<WindowEm> | undefined
    // Two passes are intentional: React effects can enqueue persistence after the first idle wait.
    await waitForBrowserSettled()
    await em?.testHelpers?.waitForTreecrdtIdle?.()
    await waitForBrowserSettled()
    await em?.testHelpers?.waitForTreecrdtIdle?.()
    await waitForBrowserSettled()
    await waitForCursorEditableMounted()
  })
}

export default waitForEmIdle
