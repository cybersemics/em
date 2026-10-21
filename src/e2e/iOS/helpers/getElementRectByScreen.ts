import type { Element } from 'webdriverio'
import getScreenOffsetY from './getScreenOffsetY.js'

/** Get an element's rect in the screen coordinates that performActions delivers touches in. */
const getElementRectByScreen = async (element: Element) => {
  const elementRect = await browser.getElementRect(element.elementId)
  return {
    ...elementRect,
    y: elementRect.y + (await getScreenOffsetY()),
  }
}

export default getElementRectByScreen
