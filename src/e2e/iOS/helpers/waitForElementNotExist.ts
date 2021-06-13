import { Browser } from 'webdriverio'

/** Wait for the element until not exist. */
const waitForElementNotExist = async (browser: Browser<any>, selector: string) => {
  return browser.waitUntil(async () => !(await browser.$(selector)).elementId)
}

export default waitForElementNotExist
