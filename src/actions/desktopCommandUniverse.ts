import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles the desktop command universe. */
const desktopCommandUniverse = (state: State) => ({
  ...state,
  showDesktopCommandUniverse: !state.showDesktopCommandUniverse,
})

/** Action-creator for desktopCommandUniverse. */
export const desktopCommandUniverseActionCreator = (): Thunk => dispatch => dispatch({ type: 'desktopCommandUniverse' })

export default _.curryRight(desktopCommandUniverse)

// Register this action's metadata
registerActionMetadata('desktopCommandUniverse', {
  undoable: false,
})
