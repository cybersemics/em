import type { Element } from 'webdriverio'
import getScreenOffset from './getScreenOffset.js'

/**
 * Get element's rect by device screen.
 * Uses the global browser object from WDIO.
 */
const getElementRectByScreen = async (element: Element) => {
  const offset = await getScreenOffset()
  const elementRect = await browser.getElementRect(element.elementId)
  // getElementRect is page-relative, so the scroll has to come back off before the viewport-to-screen offset
  // goes on.
  return {
    ...elementRect,
    x: elementRect.x + offset.x - offset.scrollX,
    y: elementRect.y + offset.y - offset.scrollY,
  }
}

export default getElementRectByScreen
