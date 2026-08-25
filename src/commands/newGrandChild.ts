import Command from '../@types/Command'
import { newGrandChildActionCreator as newGrandChild } from '../actions/newGrandChild'
import SettingsIcon from '../components/icons/SettingsIcon'
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
  canExecute: () => isDocumentEditable(),
  exec: dispatch => dispatch(newGrandChild()),
} satisfies Command

export default newGrandChildCommand
