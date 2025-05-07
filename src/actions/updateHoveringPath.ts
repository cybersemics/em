import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Reducer for setting the hoveringPath when drag leave is firing. */
const updateHoveringPath = (state: State, { path }: { path: Path | undefined }) => ({
  ...state,
  hoveringPath: path,
})

/** Action-creator for state.hoveringPath. */
export const updateHoveringPathActionCreator =
  ({ path }: { path: Path | undefined }): Thunk =>
  dispatch =>
    dispatch([{ type: 'updateHoveringPath', path }])

export default _.curryRight(updateHoveringPath)

// Register this action's metadata
registerActionMetadata('updateHoveringPath', {
  undoable: false,
})
