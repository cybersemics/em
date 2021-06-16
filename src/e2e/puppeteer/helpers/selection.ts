/* eslint-disable fp/no-get-set */
import { Page } from 'puppeteer'

/** Returns a proxy selection object with async getters for selection properties. */
const selection = (page: Page) => {
  return {
    get focusOffset() {
      return page.evaluate(() => window.getSelection()?.focusOffset)
    },
    get focusNode() {
      return {
        get textContent() {
          return page.evaluate(() => window.getSelection()?.focusNode?.textContent)
        }
      }
    },
  }
}

export default selection
