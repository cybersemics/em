/** Moves whatever of el follows the collapsed range into a copy of el placed directly after it, so that the range
 * becomes a boundary between two siblings rather than a point inside one. */
const splitAtRange = (el: HTMLElement, range: Range) => {
  const tail = document.createRange()
  tail.setStart(range.startContainer, range.startOffset)
  tail.setEnd(el, el.childNodes.length)
  const contents = tail.extractContents()
  if ((contents.textContent ?? '') === '') return
  const clone = el.cloneNode(false) as HTMLElement
  clone.appendChild(contents)
  el.after(clone)
}

export default splitAtRange
