import { Page } from 'puppeteer'

/** Scroll to the top of the page. */
const scroll = async (page: Page, x: number, y: number) => {
  await page.evaluate(
    (x: number, y: number) => {
      window.scroll(x, y)
    },
    x,
    y,
  )
}

export default scroll
