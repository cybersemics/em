type SelectionOptionsType = {
  offset?: number
  end?: boolean
}

/** Set the selection at the desired offset on the given node. Inserts empty text node when element has no children.
 * NOTE: asyncFocus() needs to be called on mobile before setSelection and before any asynchronous effects that call setSelection.
 *
  @param focusNode  The node that needs to be focused on.
  @param offset    Character offset of selection.
  @param end       If true, sets the offset to the end of the text.
 */
export const setSelection = (focusNode: Node, { offset = 0, end = false }: SelectionOptionsType = { offset: 0, end: false }) => {

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
      range.setStart(focusNode, end ? getEndOffset() : offset)
    }
    catch (e) {
      console.warn(e)
    }
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
