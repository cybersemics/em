import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Refreshes the page. */
const refresh = () => global.page.evaluate(() => window.location.reload())

export default refresh
