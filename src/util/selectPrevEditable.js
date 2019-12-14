export const selectPrevEditable = currentNode => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex > 0) {
    allElements[currentIndex - 1].focus()
  }
}
