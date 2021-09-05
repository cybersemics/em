/** Clears the browser selection. */
export const clearSelection = (): void => {
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
  }
}
