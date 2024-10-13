import { Page } from 'puppeteer'

/** Scroll an element into view using its query selector. */
const scrollIntoView = async (page: Page, selector: string) => {
  await page.evaluate(selector => {
    const element = document.querySelector(selector)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, selector)
}

export default scrollIntoView
