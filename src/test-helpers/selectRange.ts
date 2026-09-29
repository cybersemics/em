import * as selection from '../device/selection'

/**
 * Selects the plain text range [start, end) of an element, walking across any nested formatting nodes. Returns the
 * selected text.
 *
 * Not `selection.setRange`, which anchors an offset that falls on a node boundary to the end of the preceding text
 * node. A browser anchors it to the start of the node holding the first selected character, and the difference is
 * observable to anything that reads the range's container offsets.
 */
const selectRange = (element: HTMLElement, selectionStart: number, selectionEnd: number): string => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let start: { node: Node; offset: number } | null = null
  let end: { node: Node; offset: number } | null = null
  let offset = 0

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent!.length
    if (!start && selectionStart < offset + length) start = { node, offset: selectionStart - offset }
    if (start && selectionEnd <= offset + length) {
      end = { node, offset: selectionEnd - offset }
      break
    }
    offset += length
  }

  if (!start || !end)
    throw new Error(`No text at offsets ${selectionStart}-${selectionEnd} of "${element.textContent}"`)

  selection.restore({ node: end.node, offset: end.offset, anchor: start })

  return element.textContent!.slice(selectionStart, selectionEnd)
}

export default selectRange
