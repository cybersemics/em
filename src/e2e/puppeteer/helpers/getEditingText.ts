import { Page } from 'puppeteer'

/**
 * Get the thought value that cursor on.
 */
const getEditingText = (page: Page) =>
  page.evaluate(() => {
    return document.querySelector('.editing .editable')?.innerHTML
  })

export default getEditingText
