/** Set the selection to the end of the given element
  @param DOMElement        The input or contenteditable element to select.
  @param Number  offset    Character offset of selection.
  @param Boolean end       If true, sets the offset to the end of the text.
*/
export const setSelection = (el, { offset, end } = {}) => {
  if (el.childNodes.length === 0) {
    el.appendChild(document.createTextNode(''))
  }
  const textNode = el.firstChild
  const range = document.createRange()
  const sel = window.getSelection()
  // automatically constrain offset to text length
  range.setStart(textNode, offset ? Math.min(offset, textNode.textContent.length) : (end ? textNode.textContent.length : 0))
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
