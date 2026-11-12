import * as selection from '../device/selection'
import enclosingColorElement from './enclosingColorElement'
import removeEmptyFormatting from './removeEmptyFormatting'
import splitAtRange from './splitAtRange'

/**
 * Inserts HTML into an HTML string at a text offset. The insertion point is resolved through the DOM, so the inserted HTML inherits the formatting at that offset.
 *
 * The exception is color, when ownColor is set. The inserted HTML then does not come to rest inside an element carrying a text or background color at that offset. Instead that element is split around it, just as applying a color does, so that the inserted text keeps exactly the colors it carries, or none. Otherwise text pasted into colored text would take on that color (#6055).
 *
 * @param htmlValue The source HTML.
 * @param offset The text offset to insert at.
 * @param html The HTML to insert.
 */
const insertHtmlAtTextOffset = (
  htmlValue: string,
  offset: number,
  html: string,
  {
    ownColor,
  }: {
    /** The colors of the inserted HTML are its own, as in HTML copied from em, so it does not inherit the color at the offset. */
    ownColor?: boolean
  } = {},
): string => {
  const div = document.createElement('div')
  div.innerHTML = htmlValue

  const template = document.createElement('template')
  template.innerHTML = html

  const range = selection.collapsedRangeAtOffset(div, offset)
  const colorElement = range && ownColor ? enclosingColorElement(range.startContainer, div) : null

  if (colorElement) {
    splitAtRange(colorElement, range!)
    colorElement.after(template.content)
  } else if (range) {
    range.insertNode(template.content)
  } else {
    // a value with no text, e.g. a cleared thought, has nothing to resolve the offset against
    div.appendChild(template.content)
  }

  // inserting at the start of a color element that is split leaves it empty
  removeEmptyFormatting(div)

  return div.innerHTML
}

export default insertHtmlAtTextOffset
