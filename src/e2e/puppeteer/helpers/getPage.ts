import { Page } from 'puppeteer'

/**
 * Exposes the page object for low-level puppeteer function access.
 */
const getPage = (page: Page): Page => page

export default getPage
