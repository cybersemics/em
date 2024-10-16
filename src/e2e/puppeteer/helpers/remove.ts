import { page } from '../setup'

/** Removes the first Node that matches the selector from the DOM. NOOP if the selector is empty. */
const remove = async (selector: string) => {
  return page.evaluate((selector: string) => document.querySelector(selector)?.remove(), selector)
}

export default remove
