import type { Element } from 'webdriverio'

/**
 * Returns the page coordinates of a character offset within an element's first text node, or undefined if it has none.
 * Uses the global browser object from WDIO.
 */
const getTextOffsetCoordinates = (nodeHandle: Element, offset: number): Promise<{ x: number; y: number } | undefined> =>
  browser.execute(
    function (ele, offset) {
      // Element does not contain native properties like nodeName, textContent, etc
      // Not sure what the actual WebDriverIO type that is returned by findElement
      // Node does not contain property elementId; it is only a Node inside browser.execute, so we cannot change the typeo of the nodeHandle argument
      const textNode = (ele as unknown as Node).firstChild
      if (!textNode || textNode.nodeName !== '#text') return
      const range = document.createRange()
      range.setStart(textNode, offset ?? 0)
      const { right, top, height } = range.getBoundingClientRect()
      return {
        x: right,
        y: top + height / 2,
      }
    },
    nodeHandle,
    offset,
  )

export default getTextOffsetCoordinates
