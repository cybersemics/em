import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import durations from '../util/durations'

/** Reducer to set a parent path that should remain highlighted briefly after a drop. */
const setDroppedPath = (state: State, { path }: { path: Path | null }) => ({
  ...state,
  droppedPath: path,
})

/** Action-creator to set a parent to highlight, and auto-clear after verySlowPulse duration. */
export const setDroppedPathActionCreator =
  ({ path }: { path: Path }): Thunk =>
  dispatch => {
    dispatch({ type: 'setDroppedPath', path })

    const clearDelay = durations.get('verySlowPulse')

    // clear after delay
    setTimeout(() => {
      dispatch({ type: 'setDroppedPath', path: null })
    }, clearDelay)
  }

export default _.curryRight(setDroppedPath)

// Register this action's metadata
registerActionMetadata('setDroppedPath', {
  undoable: false,
})
