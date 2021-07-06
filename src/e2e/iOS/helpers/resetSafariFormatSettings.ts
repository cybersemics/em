import { Browser, Element } from 'webdriverio'

/** Reset safari format settings. */
const resetSafariFormatSettings = async (browser: Browser<'async'>) => {
  const oldContext = (await browser.getContext()) || 'NATIVE_APP'
  await browser.switchContext('NATIVE_APP')
  const done: Element<'async'> = await browser.$('//XCUIElementTypeButton[@name="Format Options"]')
  await done.click()
  const resetButton = await browser.$('//XCUIElementTypeButton[@name="Reset"]')
  await resetButton.click()

  // const element = await browser.$('//XCUIElementTypeOther[@name="em"]')
  // const elementRect = await browser.getElementRect(element.elementId)

  await browser.touchAction({
    action: 'tap',
    // x: elementRect.x + elementRect.width / 2,
    // y: elementRect.y + elementRect.height / 2,
    x: 300,
    y: 300,
  })

  await browser.switchContext(oldContext)
}

export default resetSafariFormatSettings
