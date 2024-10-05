import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/**
 * Exposes the page object for low-level puppeteer function access.
 */
const getPage = (): Page => global.page

export default getPage
