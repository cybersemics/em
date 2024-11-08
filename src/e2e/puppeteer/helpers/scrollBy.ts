import { page } from '../setup'

/** Scroll a parent container by a specified x and y offset using its selector. */
const scrollBy = async (selector: string, x: number, y: number) => {
  await page.evaluate(
    (selector, x, y) => {
      const container = document.querySelector(selector)
      if (!container) {
        throw new Error(`Container not found for selector: ${selector}`)
      }
      // Scroll the found container instead of the window
      container.scrollBy(x, y)
    },
    selector,
    x,
    y,
  )
}

export default scrollBy
