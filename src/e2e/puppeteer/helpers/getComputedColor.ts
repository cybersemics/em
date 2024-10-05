import { ElementHandle, Page } from 'puppeteer'

declare module global {
  const page: Page
}

/**
 * Get computed color.
 */
const getComputedColor = async (element: ElementHandle) => {
  const styleHandle = await global.page.evaluateHandle(elementHandle => {
    const cssDeclarationObject = window.getComputedStyle(elementHandle)
    return cssDeclarationObject.color
  }, element)
  const color = await styleHandle.jsonValue()
  return color as string
}

export default getComputedColor
