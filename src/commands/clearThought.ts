import Command from '../@types/Command'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import ClearThoughtIcon from '../components/icons/ClearThoughtIcon'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const clearThoughtCommand: Command = {
  id: 'clearThought',
  label: 'Clear Thought',
  description: 'Clear the text of the current thought. A quick recovery after you have changed your mind.',
  gesture: 'rl',
  keyboard: { key: 'c', alt: true, shift: true, meta: true },
  multicursor: {
    // Keep the multicursors after clearing so that the cleared state persists across all selected thoughts and typed
    // edits can be mirrored to them (see thoughtChangeHandler in Editable). The cursor is set to the first thought by
    // execMulticursor, so prevent the default cursor restoration that would move it back to the last selected thought.
    preventSetCursor: true,
    execMulticursor: (cursors, dispatch, getState) => {
      const { cursorCleared: isCursorCleared } = getState()

      // toggle off: un-clear and remove the browser selection
      if (isCursorCleared) {
        dispatch(cursorCleared({ value: false }))
        selection.clear()
        return
      }

      // Set the caret on the first selected thought (cursors are in document order), preserving the multicursors so the
      // remaining selected thoughts stay in the cleared set. A faux caret is rendered on the other cleared thoughts.
      dispatch([
        setCursor({ path: cursors[0], isKeyboardOpen: true, preserveMulticursor: true }),
        cursorCleared({ value: true }),
      ])
    },
  },
  svg: ClearThoughtIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: (dispatch, getState) => {
    const { cursorCleared: isCursorCleared } = getState()

    dispatch(cursorCleared({ value: !isCursorCleared }))

    // if toggling off, remove the browser selection
    if (isCursorCleared) {
      selection.clear()
    }
  },
}

export default clearThoughtCommand
