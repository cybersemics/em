import { Page } from 'puppeteer'

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
