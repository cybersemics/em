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

  const nodeOffset = selection.offsetFromClosestParent(div, offset)

  const range = document.createRange()
  if (nodeOffset?.node) {
    range.setStart(nodeOffset.node, nodeOffset.offset)
    range.setEnd(nodeOffset.node, nodeOffset.offset)
  } else {
    // there is no text to resolve the offset against, e.g. a cleared thought
    range.selectNodeContents(div)
    range.collapse()
  }

  const template = document.createElement('template')
  template.innerHTML = html
  range.insertNode(template.content)

  return div.innerHTML
}

export default insertHtmlAtTextOffset
