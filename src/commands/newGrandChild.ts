import Command from '../@types/Command'
import State from '../@types/State'
import { newGrandChildActionCreator as newGrandChild } from '../actions/newGrandChild'
import SettingsIcon from '../components/icons/SettingsIcon'
import { hasChildren } from '../selectors/getChildren'
import getRootPath from '../selectors/getRootPath'
import selectedPaths from '../selectors/selectedPaths'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const newGrandChildCommand = {
  id: 'newGrandChild',
  label: 'New Grandchild' as const,
  description:
    'Create a thought within the first subthought. With no cursor, creates a thought within the first thought in the root.',
  gesture: 'rdrd',
  multicursor: {
    // The action sets the cursor to the new empty grandchild with the keyboard open, ready to type. The default restore would move the caret back to the originally selected thought.
    preventSetCursor: true,
    // Select the new grandchildren rather than the parents they were created under, which also expands the ancestors of each one so that the grandchildren created away from the cursor are visible.
    selectNewCursors: true,
  },
  // TODO: Create unique icon
  svg: SettingsIcon,
  canExecute: (state: State) => {
    const selected = selectedPaths(state)
    // Without a selection, the root stands in for the cursor: the new thought is created in the first visible child of the root, so the root must have a visible child.
    const paths = selected.length > 0 ? selected : [getRootPath(state)]
    return isDocumentEditable() && paths.every(path => hasChildren(state, head(path)))
  },
  exec: dispatch => dispatch(newGrandChild()),
} satisfies Command

export default newGrandChildCommand
