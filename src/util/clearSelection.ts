/** Clears the browser selection. */
export const clearSelection = (): void => {
  const sel = document.getSelection()
  if (sel) {
    sel.removeAllRanges()
  }
}
