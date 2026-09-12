import * as selection from '../device/selection'

/**
 * Inserts HTML into an HTML string at a text offset. The insertion point is resolved through the DOM, so the inserted HTML inherits the formatting at that offset.
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

  const range = selection.collapsedRangeAtOffset(div, offset)
  // a value with no text, e.g. a cleared thought, has nothing to resolve the offset against
  if (range) {
    range.insertNode(template.content)
  } else {
    div.appendChild(template.content)
  }

  return div.innerHTML
}

export default insertHtmlAtTextOffset
