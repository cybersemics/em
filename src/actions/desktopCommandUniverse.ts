import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from './saveSelectionOffsets'

/** Toggles the desktop command universe. */
const desktopCommandUniverse = (state: State) => ({
  ...state,
  showDesktopCommandUniverse: !state.showDesktopCommandUniverse,
})

/** Action-creator for desktopCommandUniverse. */
export const desktopCommandUniverseActionCreator = (): Thunk => (dispatch, getState) => {
  // The search input takes the focus as soon as the Command Universe mounts, and the document has only one selection,
  // so the text the user had selected in their thought is gone by the time they pick a command. Snapshot it first, on
  // the way in only: the Command Universe closes itself before executing the chosen command, so clearing the snapshot
  // on the way out would take it away from the very command that needs it.
  if (!getState().showDesktopCommandUniverse) dispatch(saveSelectionOffsets())
  dispatch({ type: 'desktopCommandUniverse' })
}

export default _.curryRight(desktopCommandUniverse)

// Register this action's metadata
registerActionMetadata('desktopCommandUniverse', {
  undoable: false,
})
