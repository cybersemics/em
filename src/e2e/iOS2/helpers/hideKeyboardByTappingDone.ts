import { Browser, Element } from 'webdriverio'

/** Hide ios keyboard by tapping done button above the keyboard. */
const hideKeyboardByTappingDone = async (browser: Browser<'async'>) => {
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done = (await browser.$('//XCUIElementTypeButton[@name="Done"]')) as Element<'async'>
  await done.click()
  await done.waitForExist({ reverse: true })
  await browser.switchContext(oldContext)
}

export default hideKeyboardByTappingDone
