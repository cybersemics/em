import { page } from '../setup'

/** Hides all DOM nodes that match the selector from the DOM by setting visibility: hidden. Do nothing if the selector is empty. */
const hideVisibility = async (selector: string) => {
  return page.evaluate((selector: string) => {
    const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    els.forEach(el => {
      el.style.visibility = 'hidden'
    })
  }, selector)
}

export default hideVisibility
