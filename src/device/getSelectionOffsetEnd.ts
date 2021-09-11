import hasSelection from './hasSelection'

/** Returns the character offset at the end of the selection. Returns null if there is no selection. */
const getSelectionOffsetEnd = () => {
  if (!hasSelection()) return null
  const selection = window.getSelection()!
  const selectionStart = selection.getRangeAt(0)?.startOffset || 0
  const selectionEnd = selectionStart + selection.toString().length
  return selectionEnd
}

export default getSelectionOffsetEnd
