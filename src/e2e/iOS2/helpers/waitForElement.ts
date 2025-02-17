import { Browser, Element } from 'webdriverio'

interface WaitForElementOptions {
  timeout?: number
}

/** Wait for element. */
const waitForElement = async (
  browser: Browser<'async'>,
  selector: string,
  { timeout = 5000 }: WaitForElementOptions = {},
): Promise<Element<'async'>> => {
  await browser.waitUntil(async () => !!(await browser.$(selector)).elementId, { timeout: timeout })
  return browser.$(selector)
}

export default waitForElement
