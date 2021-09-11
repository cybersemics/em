import getCaretPositionDetails from '../device/getCaretPositionDetails'

type SelectionOptionsType = {
  offset?: number
  end?: boolean
}

/** Set the selection at the desired offset on the given node. Inserts empty text node when element has no children. If the node does not exist, noop.
 * NOTE: asyncFocus needs to be called on mobile before setSelection and before any asynchronous effects that call setSelection.
 *
  @param node      The node to set the selection on.
  @param offset    Character offset of the selection relative to the plain text content, i.e. ignoring nested HTML.
  @param end       If true, sets the offset to the end of the text.
 */
export const setSelection = (
  node: Node | null,
  { offset = 0, end = false }: SelectionOptionsType = { offset: 0, end: false },
) => {
  if (!node) return

  // if a numeric offset is given, convert the outer offset (relative to the thought) to the inner offset (relative to the nearest ancestor of the new selection) which is expected by Range
  // this handles nested HTML elements such as <b> or <i>.
  const caretPositionDetails = offset != null ? getCaretPositionDetails(node, offset) : null
  const focusNode = caretPositionDetails?.focusNode ?? node

  /** Returns end offset based on the type of node. */
  const getEndOffset = () => {
    const isTextNode = focusNode.nodeType === Node.TEXT_NODE
    return isTextNode ? focusNode.textContent?.length ?? 0 : focusNode.childNodes.length
  }

  const range = document.createRange()
  const sel = window.getSelection() || new Selection()
  // automatically constrain offset to text length
  // this may still throw an error if the text node does no exist any longer
  if (focusNode !== null) {
    try {
      range.setStart(focusNode, end ? getEndOffset() : caretPositionDetails?.offset ?? offset)
    } catch (e) {
      console.warn(e)
    }
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
