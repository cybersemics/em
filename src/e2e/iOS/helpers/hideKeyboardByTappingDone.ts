/** Dismisses the iOS keyboard via Safari's native "Done" button and blurs the active element to ensure subsequent taps trigger a fresh focus event. */
const hideKeyboardByTappingDone = async () => {
  const oldContext = ((await browser.getContext()) as string) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done = await browser.$('//XCUIElementTypeButton[@name="Done"]').getElement()
  await done.click()
  await done.waitForExist({ reverse: true })
  await browser.switchContext(oldContext)

  await browser.execute(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()

    return new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
  })
}

export default hideKeyboardByTappingDone
