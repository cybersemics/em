import { State } from '../@types'
import { expandThoughts } from '../selectors'

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

export default toggleHiddenThoughts
