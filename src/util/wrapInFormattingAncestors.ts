import isFormattingElement from './isFormattingElement'

/**
 * Wraps a container's contents in shallow clones of the given element and each formatting element it sits inside, if
 * they are formatting elements. Cloning or extracting a range's contents returns them without the tags that wholly
 * contain the range, so those tags have to be re-applied to keep its formatting (#4229).
 */
const wrapInFormattingAncestors = (container: Node, element: Element | null) => {
  // wrap outward from the innermost element; the editable itself is not a formatting element, so the walk stops there
  for (let ancestor = element; isFormattingElement(ancestor); ancestor = ancestor.parentElement) {
    const wrapper = ancestor.cloneNode(false) as HTMLElement
    while (container.firstChild) wrapper.appendChild(container.firstChild)
    container.appendChild(wrapper)
  }
}

export default wrapInFormattingAncestors
