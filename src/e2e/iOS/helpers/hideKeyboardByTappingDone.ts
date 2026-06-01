import type { WindowEm } from '../../../initialize'
import waitForEmIdle from './waitForEmIdle'

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
  await waitForEmIdle()
  await browser.waitUntil(
    () =>
      browser.execute(() => {
        const isKeyboardOpen = (window.em as Partial<WindowEm> | undefined)?.testHelpers?.getState().isKeyboardOpen
        return isKeyboardOpen !== true
      }),
    {
      timeout: 3000,
      timeoutMsg: 'em keyboard state did not close after tapping Done.',
    },
  )
}

export default hideKeyboardByTappingDone
