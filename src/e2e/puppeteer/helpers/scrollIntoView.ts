import { page } from '../setup'

interface Options {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
}

/** Scroll an element into view using its query selector. */
const scrollIntoView = async (selector: string, { behavior = 'smooth', block = 'start' }: Options = {}) => {
  await page.evaluate(
    (selector: string, behavior: ScrollBehavior, block: ScrollLogicalPosition) => {
      const element = document.querySelector(selector)
      if (element) {
        element.scrollIntoView({ behavior, block })
      }
    },
    selector,
    behavior,
    block,
  )
}

export default scrollIntoView
