import type { Element } from 'webdriverio'
import getNativeElementRect from './getNativeElementRect.js'

/**
 * Get element's rect by device screen.
 * Uses the global browser object from WDIO.
 */
const getElementRectByScreen = async (element: Element) => {
  const { x: safariContentX, y: safariContentY } = await getNativeElementRect('//XCUIElementTypeOther[@name="em"]')
  const elementRect = await browser.getElementRect(element.elementId)
  return {
    ...elementRect,
    x: elementRect.x + safariContentX,
    y: elementRect.y + safariContentY,
  }
}

export default getElementRectByScreen
