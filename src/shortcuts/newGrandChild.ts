import Shortcut from '../@types/Shortcut'
import { newGrandChildActionCreator as newGrandChild } from '../actions/newGrandChild'
import SettingsIcon from '../components/icons/SettingsIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const newGrandChildShortcut: Shortcut = {
  id: 'newGrandChild',
  label: 'New Grandchild',
  description: 'Create a thought within the first subthought.',
  gesture: 'rdrd',
  // TODO: Create unique icon
  svg: SettingsIcon,
  canExecute: () => isDocumentEditable(),
  exec: dispatch => dispatch(newGrandChild()),
}

export default newGrandChildShortcut
