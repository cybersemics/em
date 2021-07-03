import { Page } from 'puppeteer'

/**
 * Get editable node handle for the given value.
 */
const getEditable = (page: Page, value: string) =>
  page.evaluateHandle(value => {
    const xpath = `//div[contains(@class,"editable") and contains(text(), "${value}")]`
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)

export default getEditable
