import { Page } from 'puppeteer'

/**
 * Get the thought value that cursor on.
 */
const getEditingText = (page: Page) => page.evaluateHandle(() => {
  return document.querySelector('.editing .editable')?.innerHTML
})

export default getEditingText
