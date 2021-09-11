/**
 * Split given root node into two different ranges at the given selection.
 */
function splitNode(root: HTMLElement, range: Range) {
  const { firstChild, lastChild } = root

  if (!firstChild || !lastChild) return

  const previousRange = document.createRange()
  previousRange.setStartBefore(firstChild)
  previousRange.setEnd(range.startContainer, range.startOffset)

  const nextRange = document.createRange()
  nextRange.setStart(range.endContainer, range.endOffset)
  nextRange.setEndAfter(lastChild)

  return {
    previous: previousRange,
    next: nextRange,
  }
}

/**
 * Splits the given element into two proper html value at the current selection.
 */
const splitAtSelection = (el: HTMLElement, range: Range) => {
  const splitNodesResult = splitNode(el, range)

  if (!splitNodesResult) return null

  const leftDiv = document.createElement('div')
  const rightDiv = document.createElement('div')
  leftDiv.appendChild(splitNodesResult.previous.cloneContents())
  rightDiv.appendChild(splitNodesResult.next.cloneContents())

  return {
    left: leftDiv.innerHTML,
    right: rightDiv.innerHTML,
  }
}

export default splitAtSelection
