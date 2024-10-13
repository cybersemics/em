import { fetchPage } from './setup'

interface Options {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
}

/** Scroll an element into view using its query selector. */
const scrollIntoView = async (selector: string, { behavior = 'smooth', block = 'start' }: Options = {}) => {
  const page = await fetchPage() // Dynamically fetch the current page
  await page.evaluate(
    (selector, behavior, block) => {
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
