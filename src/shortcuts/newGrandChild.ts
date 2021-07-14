import { Shortcut } from '../@types'
import { newGrandChild } from '../action-creators'
import { isDocumentEditable } from '../util'

const newGrandChildShortcut: Shortcut = {
  id: 'newGrandChild',
  label: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec: dispatch => dispatch(newGrandChild()),
}

export default newGrandChildShortcut
