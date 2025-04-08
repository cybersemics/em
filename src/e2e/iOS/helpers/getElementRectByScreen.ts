import { Browser, Element } from 'webdriverio'
import getNativeElementRect from './getNativeElementRect'

/**
 * Get element's rect by device screen.
 */
const getElementRectByScreen = async (browser: Browser, element: Element) => {
  const { x: safariContentX, y: safariContentY } = await getNativeElementRect(
    browser,
    '//XCUIElementTypeOther[@name="em"]',
  )
  const elementRect = await browser.getElementRect(element.elementId)
  return {
    ...elementRect,
    x: elementRect.x + safariContentX,
    y: elementRect.y + safariContentY,
  }
}

export default getElementRectByScreen
