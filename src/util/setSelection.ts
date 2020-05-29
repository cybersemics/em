/** Set the selection to the end of the given element. Inserts empty text node when element has no children.
 * NOTE: asyncFocus() needs to be called on mobile before setSelection and before any asynchronous effects that call setSelection.
 *
  @param el        The input or contenteditable element to select.
  @param offset    Character offset of selection.
  @param end       If true, sets the offset to the end of the text.
 */
type SelectionOptionsType = {offset: number, end: number}
export const setSelection = (el: HTMLElement, { offset, end }: SelectionOptionsType = {offset: 0, end: 0}) => {
  if (el.childNodes.length === 0) {
    el.appendChild(document.createTextNode(''))
  }
  const textNode = el.firstChild
  const range = document.createRange()
  const sel = window.getSelection() || new Selection()
  // automatically constrain offset to text length
  // this may still throw an error if the text node does no exist any longer
  if(textNode!==null) {
    try {
      range.setStart((textNode as Node), offset ? Math.min(offset, textNode.textContent ? textNode.textContent.length : 0) : textNode.textContent ? textNode.textContent.length : 0)
     }
     catch (e) {
       console.warn(e)
     }
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
