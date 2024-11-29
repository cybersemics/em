import { page } from '../setup'

/** Hides the first Node that matches the selector from the DOM by setting display: none. Do nothing if the selector is empty. */
const hide = async (selector: string) => {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector) as HTMLElement | undefined
    if (!el) return
    el.style.display = 'none'
  }, selector)
}

export default hide
