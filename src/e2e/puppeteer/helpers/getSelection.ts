/* eslint-disable fp/no-get-set */
import { Page } from 'puppeteer'

/** Returns a proxy getSelection object with async getters for selection properties. */
const getSelection = (page: Page) => {
  return {
    get focusOffset(): Promise<number | undefined> {
      return page.evaluate(() => window.getSelection()?.focusOffset)
    },
    get focusNode() {
      return {
        get textContent(): Promise<string | undefined | null> {
          return page.evaluate(() => window.getSelection()?.focusNode?.textContent)
        }
      }
    },
  }
}

export default getSelection
