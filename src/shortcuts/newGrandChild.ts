import { isDocumentEditable } from '../util'
import { newGrandChild } from '../action-creators'
import { Shortcut } from '../types'

const newGrandChildShortcut: Shortcut = {
  id: 'newGrandChild',
  name: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec: dispatch => dispatch(newGrandChild())
}

export default newGrandChildShortcut
