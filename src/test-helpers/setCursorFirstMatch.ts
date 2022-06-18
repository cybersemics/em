import _ from 'lodash'
import setCursor from '../reducers/setCursor'
import contextToPath from '../selectors/contextToPath'
import setCursorThunk from '../action-creators/setCursor'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** A reducer that sets the cursor to the given unranked path. Uses contextToPath. */
const setCursorFirstMatch = (state: State, pathUnranked: string[]): State =>
  setCursor(state, {
    path: contextToPath(state, pathUnranked),
  })

/** A Thunk that sets the cursor to the given unranked path. */
export const setCursorFirstMatchActionCreator =
  (pathUnranked: string[]): Thunk =>
  (dispatch, getState) =>
    dispatch(
      setCursorThunk({
        path: contextToPath(getState(), pathUnranked),
      }),
    )

export default _.curryRight(setCursorFirstMatch)
