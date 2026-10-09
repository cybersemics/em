import type { Element } from 'webdriverio'
import waitForElement from './waitForElement'

/** Consecutive animation frames the element must hold its position for. Comfortably outlasts layoutNodeAnimation (150ms), so a frame of a layout transition can never pass for rest. */
const FRAMES_AT_REST = 15

/** Milliseconds to wait for the element to come to rest before failing. */
const TIMEOUT = 5000

/**
 * Wait for an element to exist and stop moving. Animations run at full duration on a BrowserStack device, so an element
 * that has only just rendered may still be sliding into place, and a tap aimed at the rect read mid-transition lands on
 * whatever has since moved under it.
 */
const waitForElementAtRest = async (selector: string): Promise<Element> => {
  const element = await waitForElement(selector)

  const result = await browser.execute(
    (selector: string, framesAtRest: number, timeout: number) =>
      new Promise<string | null>(resolve => {
        const start = performance.now()
        let last: string | null = null
        let stableFrames = 0

        /** Compares the element's position against the previous frame. */
        const check = () => {
          const rect = document.querySelector(selector)?.getBoundingClientRect()
          const position = rect ? `${rect.left},${rect.top},${rect.width},${rect.height}` : null
          stableFrames = position !== null && position === last ? stableFrames + 1 : 0
          last = position
          if (stableFrames >= framesAtRest) return resolve(null)
          if (performance.now() - start > timeout) return resolve(position)
          requestAnimationFrame(check)
        }

        requestAnimationFrame(check)
      }),
    selector,
    FRAMES_AT_REST,
    TIMEOUT,
  )

  if (result !== null) {
    throw new Error(`${selector} did not come to rest within ${TIMEOUT}ms. Last position: ${result}`)
  }

  return element
}

export default waitForElementAtRest
