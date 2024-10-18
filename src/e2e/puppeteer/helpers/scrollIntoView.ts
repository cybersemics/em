import { page } from '../setup'

interface Options {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
}

/** Scroll an element into view using its query selector. */
const scrollIntoView = async (selector: string, { behavior = 'instant', block = 'start' }: Options = {}) => {
  await page.evaluate(
    (selector: string, behavior: ScrollBehavior, block: ScrollLogicalPosition) => {
      const element = document.querySelector(selector)
      if (!element) {
        throw new Error(`Element not found for selector: ${selector}`)
      }
      element.scrollIntoView({ behavior, block })
    },
    selector,
    behavior,
    block,
  )
}

export default scrollIntoView
