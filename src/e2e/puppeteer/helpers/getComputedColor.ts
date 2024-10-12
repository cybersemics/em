import { ElementHandle } from 'puppeteer'
import { fetchPage } from './setup'

/**
 * Get computed color.
 */
const getComputedColor = async (element: ElementHandle) => {
  const styleHandle = await fetchPage().evaluateHandle(elementHandle => {
    const cssDeclarationObject = window.getComputedStyle(elementHandle)
    return cssDeclarationObject.color
  }, element)
  const color = await styleHandle.jsonValue()
  return color as string
}

export default getComputedColor
