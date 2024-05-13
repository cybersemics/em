import State from '../@types/State'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'

/** Shows or hides all hidden and metaprogramming thoughts. */
const toggleHiddenThoughts = (state: State) => {
  const toggledState = {
    ...state,
    showHiddenThoughts: !state.showHiddenThoughts,
  }
  return {
    ...toggledState,
    expanded: expandThoughts(toggledState, toggledState.cursor),
  }
}

/** Action-creator for toggleHiddenThoughts. */
export const toggleHiddenThoughtsActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleHiddenThoughts' })

export default toggleHiddenThoughts
