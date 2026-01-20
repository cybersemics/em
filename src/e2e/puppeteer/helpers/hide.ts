import { page } from '../setup'

/** Hides the first Node that matches the selector from the DOM by setting visibility: hidden. Do nothing if the selector is empty. */
const hide = async (selector: string) => {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector) as HTMLElement | undefined
    if (!el) return
    el.style.visibility = 'hidden'
  }, selector)
}

export default hide
