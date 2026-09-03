import Command from '../@types/Command'
import { newGrandChildActionCreator as newGrandChild } from '../actions/newGrandChild'
import SettingsIcon from '../components/icons/SettingsIcon'
import { hasChildren } from '../selectors/getChildren'
import selectedPaths from '../selectors/selectedPaths'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const newGrandChildCommand = {
  id: 'newGrandChild',
  label: 'New Grandchild' as const,
  description: 'Create a thought within the first subthought.',
  gesture: 'rdrd',
  multicursor: {
    // The action sets the cursor to the new empty grandchild with the keyboard open, ready to type. The default restore would move the caret back to the originally selected thought.
    preventSetCursor: true,
    // The selection of parent thoughts is stale once the caret is in a new empty grandchild; keeping it would aim the next multicursor command at the parents while the user is typing elsewhere.
    clearMulticursor: true,
  },
  // TODO: Create unique icon
  svg: SettingsIcon,
  canExecute: state => {
    // The action no-ops on a thought with no visible child, since there is no subthought to create the grandchild in. The command is therefore only executable if every selected thought has a visible child, so that a selection containing an ineligible thought disables it rather than partially applying. The selected thoughts are not necessarily the cursor, e.g. when a thought is long pressed while the cursor is elsewhere.
    const paths = selectedPaths(state)
    return isDocumentEditable() && paths.length > 0 && paths.every(path => hasChildren(state, head(path)))
  },
  exec: dispatch => dispatch(newGrandChild()),
} satisfies Command

export default newGrandChildCommand
