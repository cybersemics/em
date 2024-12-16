import Command from '../@types/Command'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import ClearThoughtIcon from '../components/icons/ClearThoughtIcon'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const clearThoughtShortcut: Command = {
  id: 'clearThought',
  label: 'Clear Thought',
  description: 'Clear the text of the current thought. A quick recovery after you have changed your mind.',
  gesture: 'rl',
  keyboard: { key: 'c', alt: true, shift: true, meta: true },
  multicursor: {
    enabled: false,
    error: 'Cannot clear multiple thougths.',
  },
  svg: ClearThoughtIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: (dispatch, getState) => {
    const isCursorCleared = getState().cursorCleared

    dispatch(cursorCleared({ value: !isCursorCleared }))

    // if toggling off, remove the browser selection
    if (isCursorCleared) {
      selection.clear()
    }
  },
}

export default clearThoughtShortcut
