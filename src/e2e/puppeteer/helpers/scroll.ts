import { Page } from 'puppeteer'

declare module global {
  const page: Page;
}

/** Scroll to the top of the page. */
const scroll = async (x: number, y: number) => {
  await global.page.evaluate(
    (x: number, y: number) => {
      window.scroll(x, y)
    },
    x,
    y,
  )
}

export default scroll
