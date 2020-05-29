/** Focus on the previous .editable element in the DOM before the given .editable. May be a sibling or the nearest ancestor's prev sibling. */
export const selectPrevEditable = (currentNode: Node) => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex > 0) {
    (allElements[currentIndex - 1] as HTMLElement).focus()
  }
}
