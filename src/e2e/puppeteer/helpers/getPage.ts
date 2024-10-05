import { Page } from 'puppeteer'

declare module global {
  const page: Page
}

/**
 * Exposes the page object for low-level puppeteer function access.
 */
const getPage = (): Page => global.page

export default getPage
