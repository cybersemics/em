/** Wraps the browser Selection API in a device-agnostic interface. */

import getElementPaddings from './getElementPaddings'

/** Clears the selection. */
export const clear = () => window.getSelection()?.removeAllRanges()

/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. Returns undefined if there is no selection. */
export const isCollapsed = () => window.getSelection()?.isCollapsed

/** Returns true if there is an active selection. */
export const isActive = () => !!window.getSelection()?.focusNode

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

/** Returns the selection text, or null if there is no selection. */
export const text = () => window.getSelection()?.toString() || null
