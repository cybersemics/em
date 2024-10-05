import { Page } from 'puppeteer'

declare module global {
  const page: Page
}

/**
 * Get editable node handle for the given value.
 */
const getEditable = (value: string) =>
  global.page.evaluateHandle(value => {
    const xpath = `//div[contains(@class,"editable") and contains(text(), "${value}")]`
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)

export default getEditable
