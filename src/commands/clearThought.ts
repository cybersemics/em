import Command from '../@types/Command'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import ClearThoughtIcon from '../components/icons/ClearThoughtIcon'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isMulticursorPath from '../selectors/isMulticursorPath'
import simplifyPath from '../selectors/simplifyPath'
import headValue from '../util/headValue'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggles the transient clear thought mode on the cursor thought. The editable renders empty and typing replaces the old text, but the persisted value is untouched; navigating away restores it. */
const toggleClearThought = (dispatch: Dispatch, getState: () => State) => {
  const { cursorCleared: isCursorCleared } = getState()

  dispatch(cursorCleared({ value: !isCursorCleared }))

  // if toggling off, remove the browser selection
  if (isCursorCleared) {
    selection.clear()
  }
}

const clearThoughtCommand: Command = {
  id: 'clearThought',
  label: 'Clear Thought',
  description: 'Clear the text of the current thought. A quick recovery after you have changed your mind.',
  gesture: 'rl',
  keyboard: { key: 'c', alt: true, shift: true, meta: true },
  multicursor: {
    // The cursor restore at the end of the multicursor loop dispatches setCursor, which resets cursorCleared and would immediately cancel the transient mode entered by the single-thought branch below. execMulticursor never moves the cursor, so there is nothing to restore in the multi-thought branch either.
    preventSetCursor: true,
    execMulticursor: (cursors, dispatch, getState) => {
      // A single selected thought enters the same transient clear mode as a plain cursor. On mobile, opening the Command Center selects the cursor thought, so this is the normal way the command is invoked there.
      if (cursors.length === 1) {
        const state = getState()
        if (!state.cursor || !isMulticursorPath(state, state.cursor)) {
          dispatch(setCursor({ path: cursors[0] }))
        }
        toggleClearThought(dispatch, getState)
        return
      }

      // The transient cursorCleared mode is a single global flag on the cursor thought, so it cannot represent multiple selected thoughts. Clear their persisted text instead. isMulticursorExecuting collapses the edits into a single undo step.
      cursors.forEach(path => {
        const state = getState()
        const oldValue = headValue(state, path)
        // nothing to clear on a missing or already-empty thought; editThought bails on a divider on its own
        if (!oldValue) return
        dispatch(
          editThought({
            oldValue,
            newValue: '',
            path: simplifyPath(state, path),
            // ContentEditable does not re-render while editing, so force the Editable to re-render when the cursor thought is cleared while in edit mode
            force: true,
          }),
        )
      })
    },
  },
  svg: ClearThoughtIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: toggleClearThought,
}

export default clearThoughtCommand
