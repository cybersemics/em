/**
 * Returns proper cursor offset for the content editable.
 *
 * @param element - Currently focused element whose cursor offset needs to be calculated.
 *
 */
export const getCaretCharacterOffset = (element: HTMLElement) => {
  if (typeof window.getSelection !== 'undefined' && window.getSelection() && window.getSelection()!.rangeCount > 0) {
    const range = window.getSelection()!.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(element)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    return preCaretRange.toString().length
  }
  return 0
}
