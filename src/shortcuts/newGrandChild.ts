import isDocumentEditable from '../util/isDocumentEditable'
import newGrandChild from '../action-creators/newGrandChild'
import Shortcut from '../@types/Shortcut'

const newGrandChildShortcut: Shortcut = {
  id: 'newGrandChild',
  label: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec: dispatch => dispatch(newGrandChild()),
}

export default newGrandChildShortcut
