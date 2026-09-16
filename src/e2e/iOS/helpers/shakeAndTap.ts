/**
 * Shakes the device and taps a button in the native undo/redo alert that iOS puts up in response.
 *
 * The alert is a native view rather than part of the page, so it can only be reached from the `NATIVE_APP` context.
 * The web context is restored before returning, so a caller can go on asserting against the page.
 */
const shakeAndTap = async (label: 'Undo' | 'Redo') => {
  const webContext = (await browser.getContext()) as string
  await browser.execute('mobile: shake')

  await browser.switchContext('NATIVE_APP')
  try {
    const button = await browser.$(
      `-ios predicate string:type == "XCUIElementTypeButton" AND label CONTAINS[c] "${label}"`,
    )
    // The alert animates in, so wait for the button rather than assuming it is already there.
    await button.waitForExist({ timeout: 5000, timeoutMsg: `the native ${label} alert did not appear after a shake` })
    await button.click()
  } finally {
    await browser.switchContext(webContext)
  }
}

export default shakeAndTap
