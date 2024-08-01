import _ from 'lodash'
import Commands from '../@types/Commands'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Updates the bold, italic, underline, and strikethrough commands. */
const updateCommands = (state: State, { payload }: { payload: Commands }) => {
  return {
    ...state,
    commands: payload,
  }
}

/** Updates the bold, italic, underline, and strikethrough commands based on what is selected. */
export const updateCommandsActionCreator = (): Thunk => dispatch => {
  dispatch({
    type: 'updateCommands',
    payload: {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikethrough'),
    },
  })
}

export default _.curryRight(updateCommands)
