import { ElementHandle, Page } from 'puppeteer'

/**
 * Get computed color.
 */
const getComputedColor = async (page: Page, element: ElementHandle) => {
  const styleHandle = await page.evaluateHandle(elementHandle => {
    const cssDeclarationObject = window.getComputedStyle(elementHandle)
    return cssDeclarationObject.color
  }, element)
  const color = await styleHandle.jsonValue()
  return color as string
}

export default getComputedColor
