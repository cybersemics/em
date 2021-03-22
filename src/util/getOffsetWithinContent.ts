/**
 * Finds the selection offset relative to the innerHTML of an element.
 */
export const getOffsetWithinContent = (el: HTMLElement) => {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0) return 0

  // creating a dummy text node with unprintable character
  const target = document.createTextNode('\u0001')

  // insert dummy text at the end of the range
  sel!.getRangeAt(0).insertNode(target)

  const nodeBeforeCaret = el.childNodes[0]

  // find the index of the dummy text within the inner html of the contenteditable
  const offset = nodeBeforeCaret?.nodeValue?.length

  target.parentNode?.removeChild(target)
  return offset || 0
}
