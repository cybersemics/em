import { Page } from 'puppeteer'
import setup from './helpers/setup'

let page: Page | null = null;

beforeEach(async () => {
  page = await setup()
}, 60000)

afterEach(async () => {
  if (page) {
    await page.close().catch(() => {
      // Ignore errors when closing the page.
    })
  }
})
