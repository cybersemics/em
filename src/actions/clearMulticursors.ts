import State from '../@types/State'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'

/** Clears all multicursors and updates expanded state based on current cursor. */
const clearMulticursors = (state: State): State => {
  const stateWithoutMulticursors = {
    ...state,
    multicursors: {},
  }

  return {
    ...state,
    multicursors: {},
    expanded: expandThoughts(stateWithoutMulticursors, state.cursor),
  }
}

/** Action-creator for clearMulticursors. */
export const clearMulticursorsActionCreator = (): Thunk => dispatch => dispatch({ type: 'clearMulticursors' })

export default clearMulticursors
