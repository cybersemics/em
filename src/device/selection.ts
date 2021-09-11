/** Wraps the browser Selection API in a device-agnostic interface. */

/** Clears the selection. */
export const clear = () => window.getSelection()?.removeAllRanges()

/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. */
export const isCollapsed = () => window.getSelection()?.isCollapsed

/** Returns true if there is an active selection. */
export const isActive = () => !!window.getSelection()?.focusNode

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
