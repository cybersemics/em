/**
 * Hide iOS keyboard by tapping done button above the keyboard.
 * Uses the global browser object from WDIO.
 */
const hideKeyboardByTappingDone = async () => {
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done = await browser.$('//XCUIElementTypeButton[@name="Done"]').getElement()
  await done.click()
  await done.waitForExist({ reverse: true })
  await browser.switchContext(oldContext)
}

export default hideKeyboardByTappingDone
