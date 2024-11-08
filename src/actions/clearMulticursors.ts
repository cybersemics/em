import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Clears all multicursors. */
const clearMulticursors = (state: State): State => {
  return {
    ...state,
    multicursors: {},
  }
}

/** Action-creator for clearMulticursors. */
export const clearMulticursorsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearMulticursors' })

export default clearMulticursors
