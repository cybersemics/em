import { page } from '../session'

/** Sets the selection of the text in the editable, walking across formatting tags. */
const setSelection = async (start: number, end: number) => {
  await page.evaluate(
    (start: number, end: number) => {
      const selection = window.getSelection()
      const range = document.createRange()
      const editable = document.querySelector('[data-editing=true] [data-editable]')
      if (!editable) {
        throw new Error('No editing editable found')
      }

      /** Resolves a plain-text offset to its text node and local offset. */
      const positionAtOffset = (target: number) => {
        const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
        let offset = 0
        let node = walker.nextNode()
        while (node) {
          const length = node.textContent?.length ?? 0
          if (target <= offset + length) return { node, offset: target - offset }
          offset += length
          node = walker.nextNode()
        }
        throw new Error(`Selection offset ${target} is outside the editable`)
      }

      const startPosition = positionAtOffset(start)
      const endPosition = positionAtOffset(end)
      range.setStart(startPosition.node, startPosition.offset)
      range.setEnd(endPosition.node, endPosition.offset)
      selection?.removeAllRanges()
      selection?.addRange(range)
    },
    start,
    end,
  )
}

export default setSelection
