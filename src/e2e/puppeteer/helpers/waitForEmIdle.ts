import type { WindowEm } from '../../../initialize'
import { page } from '../setup'
import waitForBrowserSettled from './waitForBrowserSettled'

/** Waits for TreeCRDT persistence and React's post-paint focus/selection effects after an e2e action. */
const waitForEmIdle = async (): Promise<void> => {
  /** Waits for TreeCRDT writes and materialization work exposed by the app test helpers. */
  const waitForTreecrdtIdle = () =>
    page.evaluate(async () => {
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
