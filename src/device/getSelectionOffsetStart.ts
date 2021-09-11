import hasSelection from './hasSelection'

/** Returns the character offset at the start of the selection. Returns null if there is no selection. */
const getSelectionOffsetStart = () => {
  if (!hasSelection()) return null
  return window.getSelection()!.getRangeAt(0)?.startOffset || 0
}

export default getSelectionOffsetStart
