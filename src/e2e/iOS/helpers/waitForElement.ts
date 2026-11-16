interface WaitForElementOptions {
  timeout?: number
}

/**
 * Wait for element to exist.
 * Uses the global browser object from WDIO.
 */
const waitForElement = async (
  selector: string,
  { timeout = 5000 }: WaitForElementOptions = {},
): Promise<WebdriverIO.Element> => {
  await browser.waitUntil(async () => !!(await browser.$(selector)).elementId, { timeout })
  return browser.$(selector).getElement()
}

export default waitForElement
