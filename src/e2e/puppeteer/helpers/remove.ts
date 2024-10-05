import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  let page: Page;
}

/** Removes the first Node that matches the selector from the DOM. NOOP if the selector is empty. */
const remove = async (selector: string) => {
  return global.page.evaluate((selector: string) => document.querySelector(selector)?.remove(), selector)
}

export default remove
