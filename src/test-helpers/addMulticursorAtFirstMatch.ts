import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import addMulticursor, { addMulticursorActionCreator } from '../actions/addMulticursor'
import contextToPath from '../selectors/contextToPath'

/** A reducer that adds a multicursor at the first match of the given unranked path. Uses contextToPath. */
const addMulticursorAtFirstMatch = (state: State, pathUnranked: string[] | null): State => {
  const path = pathUnranked ? contextToPath(state, pathUnranked) : null
  return path ? addMulticursor(state, { path }) : state
}

/** A Thunk that adds a multicursor at the first match of the given unranked path. */
export const addMulticursorAtFirstMatchActionCreator =
  (pathUnranked: string[] | null): Thunk =>
  (dispatch, getState) => {
    const path = pathUnranked ? contextToPath(getState(), pathUnranked!) : null

    if (path) dispatch(addMulticursorActionCreator({ path }))
  }

export default _.curryRight(addMulticursorAtFirstMatch)
