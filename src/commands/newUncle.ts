import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import NewSubthoughtNextIcon from '../components/icons/NewSubthoughtNextIcon'
import selectedPaths from '../selectors/selectedPaths'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

// NOTE: The keyboard shotcut for New Uncle handled in New Thought command until it is confirmed that commands are evaluated in the correct order
const newUncleCommand = {
  id: 'newUncle',
  label: 'New Subthought (next)' as const,
  systemMenu: 'Edit',
  description: 'Add a new thought one level up. Same as creating a new thought and then outdenting it.',
  gesture: 'dl',
  keyboard: { key: 'Enter', meta: true, alt: true },
  multicursor: {
    // The cursor restore at the end of the multicursor loop would pull the caret off the empty thought created for the last selected thought. The newThought action places the cursor on each thought it creates, so preventing the restore leaves the caret there, ready to type — the same postcondition as a single-cursor invocation.
    preventSetCursor: true,
    // The original selection is stale once the new thoughts exist, so select the new thoughts instead. A selected root thought is skipped by the per-iteration canExecute check and contributes none.
    selectNewCursors: true,
  },
  svg: NewSubthoughtNextIcon,
  canExecute: state => {
    // A root thought has no parent to insert at, so the command needs at least one selected thought below the root, whether that is the cursor or a selected thought when the cursor is missing or on a root thought. Selected root thoughts alongside it do not block the multicursor run: the loop's per-iteration setCursor clears the selection, so the per-iteration canExecute check fails for them and they are skipped.
    return isDocumentEditable() && selectedPaths(state).some(path => path.length > 1)
  },
  exec: (dispatch, getState) => {
    const { cursor } = getState()
    if (!cursor) return
    dispatch(newThought({ at: parentOf(cursor) }))
  },
} satisfies Command

export default newUncleCommand
