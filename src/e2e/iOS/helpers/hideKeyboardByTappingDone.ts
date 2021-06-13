import waitForElementNotExist from './waitForElementNotExist'
import { Browser } from 'webdriverio'

/** Hide ios keyboard by tapping done button above the keyboard. */
const hideKeyboardByTappingDone = async (browser: Browser<'async'>) => {
  const oldContext = await browser.getContext() || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done = await browser.$('//XCUIElementTypeButton[@name="Done"]')
  await done.click()
  await waitForElementNotExist(browser, '//XCUIElementTypeButton[@name="Done"]')
  await browser.switchContext(oldContext)
}

export default hideKeyboardByTappingDone
