import { Browser, Page } from 'puppeteer'
import setup from './helpers/setup'

declare module global {
  const browser: Browser
  let page: Page
}

beforeEach(async () => {
  global.page = await setup()
}, 60000)

afterEach(async () => {
  if (global.page) {
    await global.page.close().catch(() => {
      // Ignore errors when closing the page.
    })
  }
})
