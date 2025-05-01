import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Dismisses the currently-displayed tip. */
const dismissTip = (state: State): State => ({
  ...state,
  tips: state.tips.slice(1),
})

/** Action-creator for dismissTip. */
export const dismissTipActionCreator = (): Thunk => dispatch => dispatch({ type: 'dismissTip' })

export default dismissTip

// Register this action's metadata
registerActionMetadata('dismissTip', {
  undoable: false,
})
