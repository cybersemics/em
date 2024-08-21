import { Page } from 'puppeteer'
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
  if (!editableNode) throw new Error('editable node for the given value not found.')

  const details = await page.evaluate(
    (editableNode, colorType, colorValue, start, end) => {
      const thoughtContainer = editableNode.closest('.thought-container')
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

      // Serialize the details
      return {
        thoughtContainerInfo: thoughtContainer
          ? {
              tagName: thoughtContainer.tagName,
              id: thoughtContainer.id,
              classList: Array.from(thoughtContainer.classList),
              innerHTML: thoughtContainer.innerHTML, // limit to first 100 chars
            }
          : null,
        selectionInfo: selection.toString(),
      }
    },
    editableNode,
    colorType,
    colorValue,
    start,
    end,
  )
  const htmlString = details?.thoughtContainerInfo?.innerHTML
  if (!htmlString) return
  const backgroundColor = extractStyleProperty(htmlString, 'background-color')
  const textColor = extractColor(htmlString)
  return { backColor: backgroundColor, textColor: textColor }
}

export default setColor
