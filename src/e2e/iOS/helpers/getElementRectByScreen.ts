import getNativeElementRect from './getNativeElementRect'
import { Browser } from 'webdriverio'

/**
 * Get element's rect by device screen.
 * webdriverio doesn't support tapping web elements for now. So we can get web element position by device screen with this function and then tap on the position. */
const getElementRectByScreen = async (browser: Browser<'async'>, element: any) => {
  const { x: safariContentX, y: safariContentY } = await getNativeElementRect(browser, '//XCUIElementTypeOther[@name="em"]')
  const elementRect = await browser.getElementRect(element.elementId)
  return {
    ...elementRect,
    x: elementRect.x + safariContentX,
    y: elementRect.y + safariContentY
  }
}

export default getElementRectByScreen
