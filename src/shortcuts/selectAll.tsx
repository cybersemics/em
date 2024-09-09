import Shortcut from '../@types/Shortcut'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../actions/addAllMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const selectAllShortcut: Shortcut = {
  id: 'selectAll',
  label: 'Select All',
  description: 'Select all thoughts on the current level.',
  gesture: 'ldr',
  keyboard: { key: 'a', meta: true },
  canExecute: () => isDocumentEditable(),
  exec: addAllMulticursor(),
}

export default selectAllShortcut
