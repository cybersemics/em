import { Browser } from 'webdriverio'

/** Wait for element. */
const waitForElement = async(browser: Browser<any>, selector: string) => {
  await browser.waitUntil(async () => !!(await browser.$(selector)).elementId)
  return browser.$(selector)
}

export default waitForElement
