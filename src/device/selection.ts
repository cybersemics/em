/** Wraps the browser Selection API in a device-agnostic interface. */

import getElementPaddings from './getElementPaddings'

type SelectionOptionsType = {
  offset?: number
  end?: boolean
}

interface CaretPositionDetails {
  focusNode: Node | null
  offset: number
}

/** Clears the selection. */
export const clear = () => window.getSelection()?.removeAllRanges()

/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. Returns undefined if there is no selection. */
export const isCollapsed = () => window.getSelection()?.isCollapsed

/** Returns true if there is an active selection. */
export const isActive = () => !!window.getSelection()?.focusNode

/** Returns true if the selection is on a thought. */
// We should see if it is possible to just use state.editing and selection.isActive()
export const isThought = () => !!window.getSelection()?.focusNode?.parentElement?.classList.contains('editable')

/** Returns true if the selection is not on the first line of a multi-line text node. Returns true if there is no selection or if the text node is only a single line. */
export const isOnFirstLine = () => {
  const selection = window.getSelection()
  if (!selection) return true

  const { anchorNode: baseNode, rangeCount } = selection
  if (rangeCount === 0) return true

  const clientRects = selection.getRangeAt(0).getClientRects()
  if (!clientRects?.length) return true

  const { y: rangeY } = clientRects[0]
  if (!rangeY) return true

  const baseNodeParentEl = baseNode?.parentElement as HTMLElement
  if (!baseNodeParentEl) return true

  const { y: baseNodeY } = baseNodeParentEl.getClientRects()[0]
  const [paddingTop] = getElementPaddings(baseNodeParentEl)

  // allow error of 5px
  return Math.abs(rangeY - baseNodeY - paddingTop) < 5
}

/** Returns true if the selection is on the last line of its content. Returns true if there is no selection or if the text is a single line. */
export const isOnLastLine = () => {
  const selection = window.getSelection()
  if (!selection) return true

  const { anchorNode: baseNode, rangeCount } = selection
  if (rangeCount === 0) return true

  const clientRects = selection.getRangeAt(0).getClientRects()
  if (!clientRects?.length) return true

  const { y: rangeY, height: rangeHeight } = clientRects[0]
  if (!rangeY) return true

  const baseNodeParentEl = baseNode?.parentElement as HTMLElement
  if (!baseNodeParentEl) return true

  const { y: baseNodeY, height: baseNodeHeight } = baseNodeParentEl.getClientRects()[0]
  const [paddingTop, , paddingBottom] = getElementPaddings(baseNodeParentEl)

  const isMultiline = Math.abs(rangeY - baseNodeY - paddingTop) > 0
  if (!isMultiline) return true

  // allow error of 5px
  return rangeY + rangeHeight > baseNodeY + baseNodeHeight - paddingTop - paddingBottom - 5
}

/** Returns true if the browser selection is on a text node. */
export const isText = () => window.getSelection()?.focusNode?.nodeType === Node.TEXT_NODE

/** Returns the character offset of the active selection. */
export const offset = () => window.getSelection()?.focusOffset

/** Returns the character offset at the end of the selection. Returns null if there is no selection. */
export const offsetEnd = () => {
  const selection = window.getSelection()
  if (!selection) return null
  const range = selection.getRangeAt(0)
  if (!range) return null
  const selectionStart = range.startOffset || 0
  return selectionStart + selection.toString().length
}

/** Returns the character offset at the start of the selection. Returns null if there is no selection. */
export const offsetStart = () => {
  const selection = window.getSelection()
  if (!selection) return null
  const range = selection.getRangeAt(0)
  if (!range) return null
  return range.startOffset || 0
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

/** Set the selection at the desired offset on the given node. Inserts empty text node when element has no children. If the node does not exist, noop.
 * NOTE: asyncFocus needs to be called on mobile before setSelection and before any asynchronous effects that call setSelection.
 *
  @param node      The node to set the selection on.
  @param offset    Character offset of the selection relative to the plain text content, i.e. ignoring nested HTML.
  @param end       If true, sets the offset to the end of the text.
 */
export const set = (
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

/** Returns the selection text, or null if there is no selection. */
export const text = () => window.getSelection()?.toString() || null
