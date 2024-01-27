import State from '../@types/State'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'

/** Clear expand down. */
const clearExpandDown = (state: State): State => ({
  ...state,
  expanded: expandThoughts(state, state.cursor),
  expandHoverDownPaths: {},
})

/** Action-creator for clearExpandDown. */
export const clearExpandDownActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearExpandDown' })

export default clearExpandDown
