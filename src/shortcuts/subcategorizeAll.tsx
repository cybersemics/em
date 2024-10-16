import Shortcut from '../@types/Shortcut'
import { subCategorizeAllActionCreator as subCategorizeAll } from '../actions/subCategorizeAll'
import SubCategorizeAllIcon from '../components/icons/SubCategorizeAllIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const subCategorizeAllShortcut: Shortcut = {
  id: 'subcategorizeAll',
  label: 'Subcategorize All',
  description: 'Move all thoughts at the current level into a new, empty thought.',
  svg: SubCategorizeAllIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: subCategorizeAll(),
}

export default subCategorizeAllShortcut
