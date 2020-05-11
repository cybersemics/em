/** Set the selection to the end of the given element. Inserts empty text node when element has no children.
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
  // this may still throw an error if the text node does no exist any longer
  try {
    range.setStart(textNode, offset ? Math.min(offset, textNode.textContent.length) : end ? textNode.textContent.length : 0)
  }
  catch (e) {
    console.warn(e)
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
