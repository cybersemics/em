import { page } from '../session'

/** Sets the selection in the editable to a plain-text offset range, or to the first occurrence of a substring. The range may span nested nodes (e.g. a colored font/span element and an adjacent text node). */
async function setSelection(start: number, end: number): Promise<void>
async function setSelection(text: string): Promise<void>
async function setSelection(startOrText: number | string, end?: number): Promise<void> {
  await page.evaluate(
    (startOrText: number | string, end: number | undefined) => {
      const editable = document.querySelector('[data-editing=true] [data-editable]')
      if (!editable) {
        throw new Error('No editable element found')
      }

      // Resolve plain-text start/end offsets relative to the editable's text content.
      const fullText = editable.textContent ?? ''
      const start = typeof startOrText === 'string' ? fullText.indexOf(startOrText) : startOrText
      if (typeof startOrText === 'string' && start === -1) {
        throw new Error(`Text "${startOrText}" not found in editable`)
      }
      const stop = typeof startOrText === 'string' ? start + startOrText.length : end!

      // Walk the text nodes to map the plain-text offsets onto the nodes and offsets they fall within.
      const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
      let offset = 0
      let startNode: Text | null = null
      let startOffset = 0
      let endNode: Text | null = null
      let endOffset = 0
      while (walker.nextNode()) {
        const node = walker.currentNode as Text
        const length = node.textContent!.length
        if (!startNode && offset + length >= start) {
          startNode = node
          startOffset = start - offset
        }
        if (!endNode && offset + length >= stop) {
          endNode = node
          endOffset = stop - offset
          break
        }
        offset += length
      }
      if (!startNode || !endNode) {
        throw new Error('Could not resolve selection offsets')
      }

      const range = document.createRange()
      range.setStart(startNode, startOffset)
      range.setEnd(endNode, endOffset)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    },
    startOrText,
    end,
  )
}

export default setSelection
