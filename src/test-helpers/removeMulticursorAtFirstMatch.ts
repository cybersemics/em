import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import removeMulticursor, { removeMulticursorActionCreator } from '../actions/removeMulticursor'
import contextToPath from '../selectors/contextToPath'

/** A reducer that removes a multicursor at the first match of the given unranked path. Uses contextToPath. */
const removeMulticursorAtFirstMatch = (state: State, pathUnranked: string[] | null): State => {
  const path = pathUnranked ? contextToPath(state, pathUnranked) : null
  return path ? removeMulticursor(state, { path }) : state
}

/** A Thunk that removes a multicursor at the first match of the given unranked path. */
export const removeMulticursorAtFirstMatchActionCreator =
  (pathUnranked: string[] | null): Thunk =>
  (dispatch, getState) => {
    const path = pathUnranked ? contextToPath(getState(), pathUnranked!) : null

    if (path) dispatch(removeMulticursorActionCreator({ path }))
  }

export default _.curryRight(removeMulticursorAtFirstMatch)
