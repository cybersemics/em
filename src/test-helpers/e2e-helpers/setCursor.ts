import { Page } from 'puppeteer'

interface Options {
  offset?: number,
  end?: boolean,
}

/**
 * Set cursor to the first matched path and set it's selection in puppeteer environment.
 */
const setCursor = async (page: Page, unrankedPath: string[], {
  offset,
  end
}: Options) => {
  await page.evaluate(async (unrankedPath, offset, end) => {
    const testHelpers = (window.em as any).testHelpers
    await testHelpers.setCursorFirstMatch(unrankedPath)
    const focusNode = document.getSelection()?.focusNode

    if (!focusNode) throw new Error('No selection found.')

    const editableNode = focusNode.nodeName === '#text' ? focusNode.parentNode : focusNode
    /* Note: Puppeteer serializes the dom nodes when passed as arguments to an exposed function.
      Serializing nodes causes circular json error. So frequently used utils needs to be exposed to window object.
      */
    if (offset) testHelpers.setSelection(editableNode, { offset, end })
  }, unrankedPath, offset || 0, end || false)
}

export default setCursor
