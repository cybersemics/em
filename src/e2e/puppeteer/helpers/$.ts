import { Page } from 'puppeteer'

declare module global {
  const page: Page;
}

/** Performs a querySelector on the document. */
const $ = (selector: string) => global.page.$(selector)

export default $
