import { Browser } from 'webdriverio'

/** Tap 'return' on the keyboard. */
const tapReturnKey = async (browser: Browser<'async'>) => {
  const oldContext = await browser.getContext() || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const element = await browser.$('//XCUIElementTypeButton[@name="Return"]')
  await element.click()
  await browser.switchContext(oldContext)
}

export default tapReturnKey
