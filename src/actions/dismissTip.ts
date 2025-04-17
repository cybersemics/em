import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Dismisses the currently-displayed tip. */
const dismissTip = (state: State): State => ({
  ...state,
  tip: null,
})

/** Action-creator for dismissTip. */
export const dismissTipActionCreator = (): Thunk => dispatch => dispatch({ type: 'dismissTip' })

export default dismissTip
