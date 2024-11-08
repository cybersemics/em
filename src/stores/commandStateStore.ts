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
    foreColor: undefined,
    backColor: undefined,
  })
}

/** Updates the command state to the current selection/thought. If there is an active selection, this uses document.queryCommandState to get the command state from the DOM. This detects a formatting style that has been enabled, but not yet entered (i.e. the next character typed will be bold). If there is no selection, this parses the cursor thought's value and sets a formatting state only if it applies to the entire thought. */
export const updateCommandState = () => {
  const state = store.getState()
  if (!state.cursor) return

  // document.queryCommandState is not defined in jsdom, so we need to make sure it exists
  const action =
    selection.isActive() && document.queryCommandState
      ? {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikethrough: document.queryCommandState('strikethrough'),
          foreColor: document.queryCommandValue('foreColor'),
          backColor: document.queryCommandValue('backColor'),
        }
      : getCommandState(pathToThought(state, state.cursor).value)
  commandStateStore.update(action)
}

export default commandStateStore
