import { Browser, Element } from 'webdriverio'

/** Reset safari format settings.
 * BrowseStack has some issues for now. 'em' is loaded %200 zoomed in safari browser sometimes, and with this util function we reset safari zoom setting.
 */
const resetSafariFormatSettings = async (browser: Browser<'async'>) => {
  const oldContext = (await browser.getContext()) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done: Element<'async'> = await browser.$('//XCUIElementTypeButton[@name="Format Options"]')
  await done.click()
  const resetButton = await browser.$('//XCUIElementTypeButton[@name="Reset"]')
  await resetButton.click()

  const windowSize = await browser.getWindowSize()

  // Focus web content by tapping center of the screen
  await browser.touchAction({
    action: 'tap',
    x: windowSize.width / 2,
    y: windowSize!.height / 2,
  })

  await browser.switchContext(oldContext)
}

export default resetSafariFormatSettings
