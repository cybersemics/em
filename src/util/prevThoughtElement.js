import { editableNode } from './editableNode'

/** Gets the editable node immediately before the node of the given path. */
export const prevThoughtElement = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const prevSubthought = child && child.previousElementSibling
  return prevSubthought && prevSubthought.querySelector('.thought')
}
