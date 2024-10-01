import Shortcut from '../@types/Shortcut'
import { subCategorizeOneActionCreator as subCategorizeOne } from '../actions/subCategorizeOne'
import Icon from '../components/icons/subCategorizeOneIcon'
import isDocumentEditable from '../util/isDocumentEditable'

// NOTE: The keyboard shortcut for New Uncle handled in New Thought command until it is confirmed that shortcuts are evaluated in the correct order
const subCategorizeOneShortcut: Shortcut = {
  id: 'subcategorizeOne',
  label: 'Subcategorize',
  description: 'Move the current thought into a new, empty thought at the same level.',
  gesture: 'lu',
  keyboard: { key: 'o', meta: true, alt: true },
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(subCategorizeOne()),
}

// a shortcut for Raine until we have custom user shortcuts
export const subCategorizeOneShortcutAlias: Shortcut = {
  id: 'subcategorizeOneAlias',
  label: 'Subcategorize',
  hideFromHelp: true,
  keyboard: { key: ']', meta: true },
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(subCategorizeOne()),
}

export default subCategorizeOneShortcut
