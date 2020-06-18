/**
 * Find cursor offset relative to the innerHTML of content editable.
 */
export const getOffsetWithinContent = (contentEditableDiv: HTMLElement) => {
  if (!document.getSelection()) return 0

  // creating a dummy text node with unprintable character
  const target = document.createTextNode('\u0001')

  // inserting node at the end of the range
  document.getSelection()!.getRangeAt(0).insertNode(target)

  // find the index of the dummy text within the inner html
  const offset = contentEditableDiv.innerHTML.indexOf('\u0001')
  target.parentNode!.removeChild(target)
  return offset !== -1 ? offset : 0
}
