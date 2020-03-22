export const selectNextEditable = currentNode => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex < allElements.length - 1) {
    allElements[currentIndex + 1].focus()
  }
}
