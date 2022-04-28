import _ from 'lodash'
import { setCursor } from '../reducers'
import { contextToPath } from '../selectors'
import { setCursor as setCursorThunk } from '../action-creators'
import { State, Thunk } from '../@types'

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
