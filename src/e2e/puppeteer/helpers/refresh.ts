import { Page } from 'puppeteer'

declare module global {
  const page: Page;
}

/** Refreshes the page. */
const refresh = () => global.page.evaluate(() => window.location.reload())

export default refresh
