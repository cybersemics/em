import _ from 'lodash'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'

/** Recursively find for saved node content. */
const findTargetFocusNode = (
  root: Element | ChildNode | null,
  savedFocusNodeContents: string,
  savedFocusOffset: number,
): ChildNode | undefined => {
  if (!root) return undefined

  const childNodes = Array.from(root.childNodes)
  const hasTextNode = childNodes.some(node => node.nodeName === '#text')
  if (hasTextNode) {
    const focusNode = childNodes.find(node => node.textContent === savedFocusNodeContents)
    return focusNode
  } else {
    return findTargetFocusNode(root.firstChild, savedFocusNodeContents, savedFocusOffset)
  }
}

/** Emphasize a selection or entire thought.
 * To be used inside shortcuts of bold/italics/underline.
 */
const emphasizeSelection = (state: State, command: 'bold' | 'italic' | 'underline'): void => {
  const thought = getThoughtById(state, _.last(state.cursor)!)
  const selection = getSelection()

  if ((selection?.toString() ?? '').length === 0 && thought.value.length !== 0) {
    const thoughtContentEditable = document.querySelector('.editable-' + thought.id)
    if (thoughtContentEditable) {
      // Save focusNode details to later find and restore the caret position after HTML styling is added or stripped.
      const savedFocusNodeContents = selection?.focusNode?.textContent
      const savedFocusOffset = selection?.focusOffset

      // Select Entire Thought Contents
      selection?.setBaseAndExtent(
        thoughtContentEditable.firstChild!,
        0,
        thoughtContentEditable.lastChild!,
        thoughtContentEditable.lastChild!.nodeName === '#text'
          ? (thoughtContentEditable.lastChild!.textContent ?? '').length
          : thoughtContentEditable.lastChild!.childNodes.length,
      )

      document.execCommand(command)

      // Remove entire selection and restore caret position if available
      selection?.removeAllRanges()

      if (savedFocusNodeContents && savedFocusOffset) {
        const newFocusNode = findTargetFocusNode(thoughtContentEditable, savedFocusNodeContents, savedFocusOffset)
        console.log(newFocusNode)
        if (newFocusNode) {
          selection?.collapse(newFocusNode, savedFocusOffset)
        }
      }
    }
  } else {
    document.execCommand(command)
  }
}

export default emphasizeSelection
