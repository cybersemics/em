import type { Element } from 'webdriverio'

interface Options {
  /** Click on the inside edge of the editable. Default: left. */
  edge?: 'left' | 'right'
  /** Number of pixels of x offset to add to the click coordinates. */
  x?: number
  /** Number of pixels of y offset to add to the click coordinates. */
  y?: number
}

/**
 * Click a node by selector or element with an optional x,y offset.
 * Note: The text character offset option from the Puppeteer version is not supported in WDIO/XCUITest.
 */
const click = async (elementOrSelector: Element | string, { edge = 'left', x = 0, y = 0 }: Options = {}) => {
  const el = typeof elementOrSelector === 'string' ? await browser.$(elementOrSelector).getElement() : elementOrSelector

  await browser.waitUntil(() => browser.$(el).isExisting(), { timeout: 10000 })

  if (!x && !y && edge === 'left') {
    await browser.$(el).click()
    return
  }

  const rect = await browser.getElementRect(el.elementId)

  // edge offsets from the element's left or right edge
  const edgeX = edge === 'left' ? rect.x + 1 : rect.x + rect.width - 1
  const centerY = rect.y + rect.height / 2

  await browser
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ x: Math.round(edgeX + x), y: Math.round(centerY + y), origin: 'viewport' })
    .down()
    .up()
    .perform()
}

export default click
