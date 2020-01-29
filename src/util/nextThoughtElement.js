import { editableNode } from './editableNode.js'

/** Gets the editable node immediately after the node of the given path. */
export const nextThoughtElement = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const nextSubthought = child && child.nextElementSibling
  return nextSubthought && nextSubthought.querySelector('.thought')
}
