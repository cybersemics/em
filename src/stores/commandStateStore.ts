import Commands from '../@types/Commands'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import getThoughtCommands from '../util/getThoughtCommands'
import store from './app'
import reactMinistore from './react-ministore'

/** A store that tracks the document's command state. */
const commandStateStore = reactMinistore<Commands>({
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
})

/** Resets the command state to false. */
export const resetCommandState = () => {
  commandStateStore.update({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
}

/** Updates the command state to the current state of the document. */
export const updateCommandState = () => {
  const state = store.getState()
  if (!state.cursor) return
  const isActive = selection.isActive()
  const action = isActive
    ? {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikethrough'),
      }
    : getThoughtCommands(pathToThought(state, state.cursor).value)
  commandStateStore.update(action)
}

export default commandStateStore
