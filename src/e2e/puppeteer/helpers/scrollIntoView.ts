import { page } from '../session'

interface Options {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
}

/** Scroll an element into view using its query selector. */
const scrollIntoView = async (
  selector: string,
  { behavior = 'instant', block = 'start', inline = 'nearest' }: Options = {},
) => {
  await page.evaluate(
    (selector: string, behavior: ScrollBehavior, block: ScrollLogicalPosition, inline: ScrollLogicalPosition) => {
      const element = document.querySelector(selector)
      if (!element) {
        throw new Error(`Element not found for selector: ${selector}`)
      }
      element.scrollIntoView({ behavior, block, inline })
    },
    selector,
    behavior,
    block,
    inline,
  )
}

export default scrollIntoView
