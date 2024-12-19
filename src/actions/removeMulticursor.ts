import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'
import hashPath from '../util/hashPath'

/** Removes a cursor from the multicursor set and updates expanded state. */
const removeMulticursor = (state: State, { path }: { path: Path }): State => {
  const { [hashPath(path)]: _, ...remainingMulticursors } = state.multicursors

  return {
    ...state,
    multicursors: remainingMulticursors,
    // Update expanded state based on remaining cursor or multicursors
    expanded: expandThoughts(state, state.cursor),
  }
}

/** Action-creator for removeMulticursor. */
export const removeMulticursorActionCreator =
  (payload: Parameters<typeof removeMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'removeMulticursor', ...payload })

export default _.curryRight(removeMulticursor)
