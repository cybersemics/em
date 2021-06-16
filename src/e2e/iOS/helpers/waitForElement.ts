import { Browser, Element } from 'webdriverio'

/** Wait for element. */
const waitForElement = async (browser: Browser<'async'>, selector: string): Promise<Element<'async'>> => {
  await browser.waitUntil(async () => !!(await browser.$(selector)).elementId)
  return browser.$(selector)
}

export default waitForElement
