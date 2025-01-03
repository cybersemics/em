import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import hashPath from '../util/hashPath'

/** Adds a cursor to the multicursor set. */
const addMulticursor = (state: State, { path }: { path: Path }): State => ({
  ...state,
  multicursors: {
    ...state.multicursors,
    [hashPath(path)]: path,
  },
})

/** Action-creator for addMulticursor. */
export const addMulticursorActionCreator =
  (payload: Parameters<typeof addMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addMulticursor', ...payload })

export default _.curryRight(addMulticursor)
