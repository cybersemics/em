import type { Element } from 'webdriverio'
import waitForElement from './waitForElement'

/** Consecutive animation frames the element must hold its position for. Comfortably outlasts layoutNodeAnimation (150ms), so a frame of a layout transition can never pass for rest. */
const FRAMES_AT_REST = 15

/** Milliseconds to wait for the element to come to rest before failing. */
const TIMEOUT = 5000

/** Where the in-page sampler keeps its state between calls. */
const SAMPLER_KEY = '__emWaitForElementAtRest'

/** In-page sampler state. Lives on window between the synchronous calls that start and read it. */
interface Sampler {
  /** The element's rect on the last frame, or null if it was not in the DOM. */
  position: string | null
  /** Consecutive frames on which the position has not changed. */
  framesAtRest: number
  /** Stops the sampler. */
  stopped: boolean
}

/**
 * Wait for an element to exist and stop moving. Animations run at full duration on a BrowserStack device, so an element
 * that has only just rendered may still be sliding into place, and a tap aimed at the rect read mid-transition lands on
 * whatever has since moved under it.
 *
 * The rect is sampled on every animation frame by a loop running in the page, and read with synchronous scripts.
 * Safari's WebDriver does not await a promise returned from a script, so the wait cannot be a single async script.
 */
const waitForElementAtRest = async (selector: string): Promise<Element> => {
  const element = await waitForElement(selector)

  // start sampling
  await browser.execute(
    (selector: string, key: string) => {
      const w = window as unknown as Record<string, Sampler>
      if (w[key]) w[key].stopped = true
      const sampler: Sampler = { position: null, framesAtRest: 0, stopped: false }
      w[key] = sampler

      /** Compares the element's rect against the previous frame. */
      const sample = () => {
        if (sampler.stopped) return
        const rect = document.querySelector(selector)?.getBoundingClientRect()
        const position = rect ? `${rect.left},${rect.top},${rect.width},${rect.height}` : null
        sampler.framesAtRest = position !== null && position === sampler.position ? sampler.framesAtRest + 1 : 0
        sampler.position = position
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    },
    selector,
    SAMPLER_KEY,
  )

  /** Reads the sampler, stopping it once the element is at rest. */
  const read = () =>
    browser.execute(
      (key: string, framesAtRest: number) => {
        const sampler = (window as unknown as Record<string, Sampler>)[key]
        const atRest = sampler.framesAtRest >= framesAtRest
        if (atRest) sampler.stopped = true
        return { atRest, position: sampler.position }
      },
      SAMPLER_KEY,
      FRAMES_AT_REST,
    )

  try {
    await browser.waitUntil(async () => (await read()).atRest, { timeout: TIMEOUT, interval: 100 })
  } catch {
    const { position } = await read()
    throw new Error(`${selector} did not come to rest within ${TIMEOUT}ms. Last position: ${position}`)
  } finally {
    await browser.execute((key: string) => {
      const w = window as unknown as Record<string, Sampler>
      if (w[key]) w[key].stopped = true
    }, SAMPLER_KEY)
  }

  return element
}

export default waitForElementAtRest
