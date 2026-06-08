import { WindowEm } from '../../../initialize'
import { page } from '../setup'

/** Scrolls instantly to the given position. Cancels the pending trailing scrollCursorIntoView throttle (400ms) first so it does not scroll the cursor back into view afterwards. */
const scrollTo = async (x: number, y: number) => {
  await page.evaluate(
    (x: number, y: number) => {
      const em = window.em as WindowEm
      em.testFlags.throttledScrollCursorIntoView?.cancel()
      window.scrollTo(x, y)
    },
    x,
    y,
  )
}

export default scrollTo
