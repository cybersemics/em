import * as selection from '../device/selection'

/**
 * Splits HTML at a text offset into the HTML before and after the offset, with formatting tags re-balanced onto both halves.
 *
 * @param htmlValue The source HTML.
 * @param offset The text offset to split at.
 */
const splitHtmlAtTextOffset = (htmlValue: string, offset: number): { left: string; right: string } => {
  const div = document.createElement('div')
  div.innerHTML = htmlValue

  const range = selection.collapsedRangeAtOffset(div, offset)
  if (!range) throw new Error(`Unable to map text offset to an HTML node: ${offset}`)

  const splitNodesResult = selection.splitNode(div, range)
  if (!splitNodesResult) return { left: '', right: '' }

  const leftDiv = document.createElement('div')
  const rightDiv = document.createElement('div')
  leftDiv.appendChild(splitNodesResult.left.cloneContents())
  rightDiv.appendChild(splitNodesResult.right.cloneContents())

  return { left: leftDiv.innerHTML, right: rightDiv.innerHTML }
}

export default splitHtmlAtTextOffset
