import { editableNode } from './editableNode.js'

/** Gets the editable node immediately before the node of the given path. */
export const prevEditable = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const prevSubthought = child && child.previousElementSibling
  return prevSubthought && prevSubthought.querySelector('.editable')
}
