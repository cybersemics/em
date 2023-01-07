import { Page } from 'puppeteer'

/** Removes the first Node that matches the selector from the DOM. NOOP if the selector is empty. */
const remove = async (page: Page, selector: string) => {
  return page.evaluate((selector: string) => document.querySelector(selector)?.remove(), selector)
}

export default remove
