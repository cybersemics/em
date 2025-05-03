import State from '../@types/State'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'
import { registerActionMetadata } from '../util/actionMetadata.registry'

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

// Register this action's metadata
registerActionMetadata('toggleHiddenThoughts', {
  undoable: true,
})
