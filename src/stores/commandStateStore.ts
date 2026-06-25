import CommandState from '../@types/CommandState'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import getCommandState from '../util/getCommandState'
import store from './app'
import reactMinistore from './react-ministore'

/** A store that tracks the document's command state (e.g. bold, italic, underline, strikethrough). */
const commandStateStore = reactMinistore<CommandState>({
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
  foreColor: undefined,
  backColor: undefined,
})

/** Resets the command state to false. */
export const resetCommandState = () => {
  commandStateStore.update({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
}

/** Updates the command state to the current selection/thought. If there is a non-collapsed selection within a thought, this parses the selected HTML to detect a formatting style that applies to the selection. Otherwise (no selection or a collapsed caret) it parses the cursor thought's value and sets a formatting state only if it applies to the entire thought. A collapsed caret deliberately uses the cursor thought's value (from state) rather than the DOM, since the DOM may be stale immediately after a programmatic edit (e.g. formatWithTag) until React re-renders. */
export const updateCommandState = () => {
  const state = store.getState()
  if (!state.cursor) return
  const action =
    selection.isActive() && selection.isThought() && !selection.isCollapsed()
      ? getCommandState(selection.html() ?? '')
      : getCommandState(pathToThought(state, state.cursor)?.value ?? '')
  commandStateStore.update(action)
}

export default commandStateStore
