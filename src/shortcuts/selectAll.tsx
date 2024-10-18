import Shortcut from '../@types/Shortcut'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../actions/addAllMulticursor'
import { isTouch } from '../browser'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const selectAllShortcut: Shortcut = {
  id: 'selectAll',
  label: 'Select All',
  svg: () => null,
  description: getState => {
    const state = getState()
    return isTouch
      ? 'Selects all thoughts at the current level. May reduce wrist strain.'
      : hasMulticursor(state)
        ? 'Selects all thoughts at the current level. When multiselect is inactive, selects all text in the current thought.'
        : 'Selects all text in the current thought. If multiple thoughts are selected, instead selects all thoughts at the current level.'
  },
  gesture: 'ldr',
  keyboard: { key: 'a', meta: true },
  multicursor: 'ignore',
  // Select All is disabled on desktop when there is no multicursor.
  // This enables the default browser behavior of selecting all text in the thought.
  canExecute: getState => isDocumentEditable() && (isTouch || hasMulticursor(getState())),
  exec: addAllMulticursor(),
}

export default selectAllShortcut
