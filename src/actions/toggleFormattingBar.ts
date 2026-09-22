import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storageModel from '../stores/storageModel'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles the mobile Formatting Bar between open (showing the bar) and closed (showing only the overflow button). */
const toggleFormattingBar = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showFormattingBar: value == null ? !state.showFormattingBar : value,
})

/** Action-creator for toggleFormattingBar. Persists the new state to local storage. */
export const toggleFormattingBarActionCreator =
  (payload: Parameters<typeof toggleFormattingBar>[1] = {}): Thunk =>
  (dispatch, getState) => {
    const next = payload.value == null ? !getState().showFormattingBar : payload.value
    storageModel.set('formattingBarOpen', next)
    dispatch({ type: 'toggleFormattingBar', value: next })
  }

export default _.curryRight(toggleFormattingBar)

// Register this action's metadata
registerActionMetadata('toggleFormattingBar', {
  undoable: false,
})
