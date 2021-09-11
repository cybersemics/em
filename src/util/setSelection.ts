type SelectionOptionsType = {
  offset?: number
  end?: boolean
}

interface CaretPositionDetails {
  focusNode: Node | null
  offset: number
}

/**
 * Recursively iterates the nodes children and returns focusNode and offset where the relative offset ends.
 */
const recursiveFocusNodeFinder = (node: Node, relativeOffset: number): CaretPositionDetails | null => {
  if (!node.hasChildNodes()) return null

  const childNodesArray = Array.from(node.childNodes)

  // find the index of the node where the length of the text content is greater or equal to the given relative offset
  const possibleFocusNodeIndex = childNodesArray.findIndex((_, i) => {
    const lenghtOfTextContent = childNodesArray
      .slice(0, i + 1)
      .reduce((acc, node) => acc + (node.textContent?.length ?? 0), 0)
    return lenghtOfTextContent >= relativeOffset
  })

  if (possibleFocusNodeIndex < 0) return null

  const possibleFocusNode = childNodesArray[possibleFocusNodeIndex]

  const isTextNode = possibleFocusNode.nodeType === Node.TEXT_NODE
  const textCountBeforeThisNode = childNodesArray
    .slice(0, possibleFocusNodeIndex)
    .reduce((acc, node) => acc + (node.textContent?.length ?? 0), 0)

  // Note: A possible focus node can itself be a focus node only if it is of type #text. Else focus node should be one of it's descendant text node.
  if (isTextNode) {
    return {
      focusNode: possibleFocusNode,
      // the actual offset should always be taken relative to the focus node.
      offset: relativeOffset - textCountBeforeThisNode,
    }
  }

  const remainingrelativeOffset = relativeOffset - textCountBeforeThisNode

  return recursiveFocusNodeFinder(possibleFocusNode, remainingrelativeOffset)
}

/**
 * Get the focus node and it's offset for the given relative offset for the given node.
 *
 * @param relativeOffset - The offset that is taken relative to the value with all the html tags removed.
 */
export const getCaretPositionDetails = (node: Node, relativeOffset: number): CaretPositionDetails | null => {
  // case where caret should be positioned at the beginning of the node.
  if (relativeOffset <= 0) return { focusNode: node, offset: 0 }

  // case where the caret should be positioned at the end of the node.
  if (node.textContent && relativeOffset >= node.textContent.length) {
    return {
      focusNode: node,
      offset: node.childNodes.length,
    }
  }

  return recursiveFocusNodeFinder(node, relativeOffset)
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
