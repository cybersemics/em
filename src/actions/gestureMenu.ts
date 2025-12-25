import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles the gesture menu. */
const gestureMenu = (state: State) => ({
  ...state,
  showGestureMenu: !state.showGestureMenu,
})

/** Action-creator for gestureMenu. */
export const gestureMenuActionCreator = (): Thunk => dispatch => dispatch({ type: 'gestureMenu' })

export default _.curryRight(gestureMenu)

// Register this action's metadata
registerActionMetadata('gestureMenu', {
  undoable: false,
})
