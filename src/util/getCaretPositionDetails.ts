interface CaretPositionDetails {
  focusNode: Node | null
  offset: number
}

/**
 * Recursively iterates the nodes children and returns focusNode and offset where the relative offset ends.
 */
const recursiveFocusNodeFinder = (node: Node, relativeOffset: number): CaretPositionDetails | null => {
  if (!node.hasChildNodes()) return null

  const childNodesArray = Array.from(node.childNodes)

  // find the index of the node where the length of the text content is greater or equal to the given relative offset
  const possibleFocusNodeIndex = childNodesArray.findIndex((_, i) => {
    const lenghtOfTextContent = childNodesArray
      .slice(0, i + 1)
      .reduce((acc, node) => acc + (node.textContent?.length ?? 0), 0)
    return lenghtOfTextContent >= relativeOffset
  })

  if (possibleFocusNodeIndex < 0) return null

  const possibleFocusNode = childNodesArray[possibleFocusNodeIndex]

  const isTextNode = possibleFocusNode.nodeType === Node.TEXT_NODE
  const textCountBeforeThisNode = childNodesArray
    .slice(0, possibleFocusNodeIndex)
    .reduce((acc, node) => acc + (node.textContent?.length ?? 0), 0)

  // Note: A possible focus node can itself be a focus node only if it is of type #text. Else focus node should be one of it's descendant text node.
  if (isTextNode) {
    return {
      focusNode: possibleFocusNode,
      // the actual offset should always be taken relative to the focus node.
      offset: relativeOffset - textCountBeforeThisNode,
    }
  }

  const remainingrelativeOffset = relativeOffset - textCountBeforeThisNode

  return recursiveFocusNodeFinder(possibleFocusNode, remainingrelativeOffset)
}

/**
 * Get the focus node and it's offset for the given relative offset for the given node.
 *
 * @param relativeOffset - The offset that is taken relative to the value with all the html tags removed.
 */
export const getCaretPositionDetails = (node: Node, relativeOffset: number): CaretPositionDetails | null => {
  // case where caret should be positioned at the beginning of the node.
  if (relativeOffset <= 0) return { focusNode: node, offset: 0 }

  // case where the caret should be positioned at the end of the node.
  if (node.textContent && relativeOffset >= node.textContent.length) {
    return {
      focusNode: node,
      offset: node.childNodes.length,
    }
  }

  return recursiveFocusNodeFinder(node, relativeOffset)
}
