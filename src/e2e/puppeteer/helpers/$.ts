import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Performs a querySelector on the document. */
const $ = (selector: string) => global.page.$(selector)

export default $
