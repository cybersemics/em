import { Page } from 'puppeteer'

/** Refreshes the page. */
const refresh = (page: Page) => page.evaluate(() => window.location.reload())

export default refresh
