import { page } from '../setup'

/** Sets the selection of the text in the editable. */
const setSelection = async (start: number, end: number) => {
  await page.evaluate(
    (start: number, end: number) => {
      const selection = window.getSelection()
      const range = document.createRange()
      const textNode = document.querySelector('[data-editing=true] [data-editable]')?.firstChild
      if (!textNode) {
        throw new Error('No text node found in editable element')
      }
      range.setStart(textNode, start)
      range.setEnd(textNode, end)
      selection?.removeAllRanges()
      selection?.addRange(range)
    },
    start,
    end,
  )
}

export default setSelection
