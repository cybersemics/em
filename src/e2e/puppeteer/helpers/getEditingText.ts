import { Page } from 'puppeteer'

declare module global {
  const page: Page
}

/**
 * Get the thought value that cursor on.
 */
const getEditingText = () =>
  global.page.evaluate(() => {
    return document.querySelector('.editing .editable')?.innerHTML
  })

export default getEditingText
