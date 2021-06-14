import { Page } from 'puppeteer'

const refresh = (page: Page) => 
  page.evaluate(() => window.location.reload())

export default refresh
