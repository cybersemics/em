import type { Element } from 'webdriverio'
import SAFARI_CHROME_TOP from './safariChromeTop.js'

/** Get an element's rect in the screen coordinates that performActions delivers touches in. */
const getElementRectByScreen = async (element: Element) => {
  const elementRect = await browser.getElementRect(element.elementId)
  return {
    ...elementRect,
    y: elementRect.y + SAFARI_CHROME_TOP,
  }
}

export default getElementRectByScreen
