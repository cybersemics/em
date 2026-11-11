import * as selection from '../device/selection'
import enclosingColorElement from './enclosingColorElement'
import splitAtRange from './splitAtRange'

/**
 * Inserts HTML into an HTML string at a text offset. The insertion point is resolved through the DOM, so the inserted HTML inherits the formatting at that offset.
 *
 * The exception is color. HTML whose text all carries its own text or background color does not come to rest inside an element carrying the color at that offset. Instead that element is split around it, just as applying a color does. Otherwise colored text pasted into text with a background would take on that background (#6055).
 *
 * @param htmlValue The source HTML.
 * @param offset The text offset to insert at.
 * @param html The HTML to insert.
 */
const insertHtmlAtTextOffset = (htmlValue: string, offset: number, html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = htmlValue

  const template = document.createElement('template')
  template.innerHTML = html

  // the inserted HTML has its own color when every non-empty text node in it sits inside a color element of its own
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  const textNodes: Node[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent) textNodes.push(node)
  }
  const hasOwnColor =
    textNodes.length > 0 && textNodes.every(node => enclosingColorElement(node, template.content) !== null)

  const range = selection.collapsedRangeAtOffset(div, offset)
  const colorElement = range && hasOwnColor ? enclosingColorElement(range.startContainer, div) : null

  if (colorElement) {
    splitAtRange(colorElement, range!)
    colorElement.after(template.content)
    // inserting at the start of the color element leaves nothing before the insertion point
    if ((colorElement.textContent ?? '') === '') colorElement.remove()
  } else if (range) {
    range.insertNode(template.content)
  } else {
    // a value with no text, e.g. a cleared thought, has nothing to resolve the offset against
    div.appendChild(template.content)
  }

  return div.innerHTML
}

export default insertHtmlAtTextOffset
