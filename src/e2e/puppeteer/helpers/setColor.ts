import { Page } from 'puppeteer'
// import click from '../../../test-helpers/click'
import getEditable from './getEditable'

// extract the background-color or color style property
const extractStyleProperty = (html: string, property: string): string | null => {
  const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i')
  const match = regex.exec(html)
  return match ? match[1].trim() : null
}

// extract the color property
const extractColor = (html: string): string | null => {
  const regex = /<font\s+color\s*=\s*["']([^"']+)["']/i
  const match = regex.exec(html)
  return match ? match[1].trim() : null
}

const setColor = async (
  page: Page,
  value: string,
  colorType: 'foreColor' | 'backColor',
  colorValue: string,
  start: number,
  end: number,
) => {
  const editableNode = await getEditable(page, value)

  const details = await page.evaluate(
    (editableNode, colorType, colorValue, start, end) => {
      const thoughtContainer = editableNode.closest('.thought-container') as HTMLElement
      if (!thoughtContainer) return null
      var textNode = editableNode.childNodes[0] // Assuming there's only text inside

      var range = document.createRange()
      range.setStart(textNode, start)
      range.setEnd(textNode, end)

      // Clear any existing selections and add the new range
      var selection = window.getSelection()
      if (!selection) return null
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand(colorType, false, colorValue)
      // clickElement(page, '.toolbar-icon[aria-label="Text Color"]')
      // clickElement(page, '[aria-label="text color swatches"] [aria-label="blue"]')
      console.log(thoughtContainer)
      // Serialize the details
      return {
        innerHTML: thoughtContainer ? thoughtContainer.innerHTML : null,
        selectionInfo: selection.toString(),
      }
    },
    editableNode,
    colorType,
    colorValue,
    start,
    end,
  )
  const htmlString = details?.innerHTML
  if (!htmlString) return
  const backgroundColor = extractStyleProperty(htmlString, 'background-color')
  const textColor = extractColor(htmlString)
  return { backColor: backgroundColor, textColor: textColor }
}

export default setColor
