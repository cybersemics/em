import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { isTouch } from '../browser'
import hashPath from '../util/hashPath'
import reducerFlow from '../util/reducerFlow'

/** Adds a cursor to the multicursor set. */
const addMulticursor = (state: State, { path, ignoreCursor }: { path: Path; ignoreCursor?: boolean }): State => {
  const isEmpty = !Object.keys(state.multicursors).length

  return reducerFlow([
    state => ({
      ...state,
      multicursors: {
        ...state.multicursors,
        [hashPath(path)]: path,
        // on desktop, add the cursor to the multicursor set if it's empty
        ...(isEmpty && !ignoreCursor && state.cursor && !isTouch ? { [hashPath(state.cursor)]: state.cursor } : {}),
      },
    }),
  ])(state)
}

/** Action-creator for addMulticursor. */
export const addMulticursorActionCreator =
  (payload: Parameters<typeof addMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addMulticursor', ...payload })

export default _.curryRight(addMulticursor)
