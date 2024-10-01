import Shortcut from '../@types/Shortcut'
import { subCategorizeAllActionCreator as subCategorizeAll } from '../actions/subCategorizeAll'
import Icon from '../components/icons/subCategorizeAllIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const subCategorizeAllShortcut: Shortcut = {
  id: 'subcategorizeAll',
  label: 'Subcategorize All',
  description: 'Move all thoughts at the current level into a new, empty thought.',
  gesture: 'ldr',
  keyboard: { key: 'a', meta: true, alt: true },
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: subCategorizeAll(),
}

export default subCategorizeAllShortcut
