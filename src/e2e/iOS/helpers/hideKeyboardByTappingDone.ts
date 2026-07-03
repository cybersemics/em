/** Dismisses the iOS keyboard by tapping the native "Done" button. */
const hideKeyboardByTappingDone = async () => {
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done = await browser.$('//XCUIElementTypeButton[@name="Done"]').getElement()
  await done.click()
  await done.waitForExist({ reverse: true })
  await browser.switchContext(oldContext)
}

export default hideKeyboardByTappingDone
