import { editableNode } from './editableNode'
import { Path } from '../types'
import { Nullable } from '../utilTypes'

/** Gets the editable node immediately before the node of the given path. */
export const prevThoughtElement = (path: Path): Nullable<HTMLElement> => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const prevSubthought = child && child.previousElementSibling
  return prevSubthought && prevSubthought.querySelector('.thought')
}
