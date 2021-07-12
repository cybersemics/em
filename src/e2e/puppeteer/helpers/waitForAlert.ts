import { Page } from 'puppeteer'

/** Waits for an alert with some text. */
const waitForAlert = (page: Page, value: string) =>
  page.evaluateHandle(value => {
    const xpath = `//div[contains(@class,"alert") and contains(text(), "${value}")]`
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue as HTMLElement
  }, value)

export default waitForAlert
