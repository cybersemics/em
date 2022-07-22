import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursorThunk from '../action-creators/setCursor'
import setCursor from '../reducers/setCursor'
import contextToPath from '../selectors/contextToPath'

/** A reducer that sets the cursor to the given unranked path. Uses contextToPath. */
const setCursorFirstMatch = (state: State, pathUnranked: string[]): State =>
  setCursor(state, {
    path: contextToPath(state, pathUnranked),
  })

/** A Thunk that sets the cursor to the given unranked path. */
export const setCursorFirstMatchActionCreator =
  (pathUnranked: string[] | null): Thunk =>
  (dispatch, getState) =>
    dispatch(
      setCursorThunk({
        path: pathUnranked ? contextToPath(getState(), pathUnranked!) : null,
      }),
    )

export default _.curryRight(setCursorFirstMatch)
