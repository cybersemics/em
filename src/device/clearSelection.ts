/** Clears the browser selection. */
const clearSelection = (): void => {
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
  }
}

export default clearSelection
