import type { WindowEm } from '../../../initialize'

/** Waits for browser layout, paint, and queued macrotasks to settle after DOM-affecting iOS e2e actions. */
const waitForBrowserSettled = async (): Promise<void> => {
  await browser.execute(async () => {
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    await new Promise(resolve => setTimeout(resolve))
  })
}

/** Waits for TreeCRDT persistence and React's post-paint focus/selection effects after an iOS e2e action. */
const waitForEmIdle = async (): Promise<void> => {
  /** Waits for TreeCRDT writes and materialization work exposed by the app test helpers. */
  const waitForTreecrdtIdle = () =>
    browser.execute(async () => {
      await (window.em as Partial<WindowEm> | undefined)?.testHelpers?.waitForTreecrdtIdle?.()
    })

  // Two passes are intentional: React effects can enqueue persistence after the first idle wait.
  await waitForBrowserSettled()
  await waitForTreecrdtIdle()
  await waitForBrowserSettled()
  await waitForTreecrdtIdle()
  await waitForBrowserSettled()
}

export default waitForEmIdle
