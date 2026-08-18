import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import NewSubthoughtNextIcon from '../components/icons/NewSubthoughtNextIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

// NOTE: The keyboard shotcut for New Uncle handled in New Thought command until it is confirmed that commands are evaluated in the correct order
const newUncleCommand: Command = {
  id: 'newUncle',
  label: 'New Subthought (next)',
  description: 'Add a new thought one level up. Same as creating a new thought and then outdenting it.',
  gesture: 'dl',
  keyboard: { key: Key.Enter, meta: true, alt: true },
  multicursor: {
    // The cursor restore at the end of the multicursor loop would pull the caret off the empty thought created for the last selected thought. The newThought action places the cursor on each thought it creates, so preventing the restore leaves the caret there, ready to type — the same postcondition as a single-cursor invocation.
    preventSetCursor: true,
    // After execution the selection is stale — the user's next act is typing into the new empty thought. Clearing matches the single-cursor behavior, where the newThought action's own setCursor clears the selection.
    clearMulticursor: true,
  },
  svg: NewSubthoughtNextIcon,
  canExecute: state => {
    const { cursor } = state
    // hasMulticursor allows the command to execute when thoughts are selected but the cursor is missing or on a root thought. Selected root thoughts (which have no parent to insert at) do not block the multicursor run: the loop's per-iteration setCursor clears the selection, so the per-iteration canExecute check fails for them and they are skipped.
    return isDocumentEditable() && ((!!cursor && cursor.length > 1) || hasMulticursor(state))
  },
  exec: (dispatch, getState) => {
    const { cursor } = getState()
    if (!cursor) return
    dispatch(newThought({ at: parentOf(cursor) }))
  },
}

export default newUncleCommand
