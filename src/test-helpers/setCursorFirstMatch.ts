import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursor, { setCursorActionCreator as setCursorThunk } from '../actions/setCursor'
import contextToPathOrThrow from './contextToPathOrThrow'

/** A reducer that sets the cursor to the given unranked path, or clears the cursor when passed null. Throws if a non-null path does not resolve. */
const setCursorFirstMatch = (state: State, pathUnranked: string[] | null): State =>
  setCursor(state, {
    path: pathUnranked ? contextToPathOrThrow(state, pathUnranked, 'setCursorFirstMatch') : null,
  })

/** A Thunk that sets the cursor to the given unranked path, or clears the cursor when passed null. Throws if a non-null path does not resolve. */
export const setCursorFirstMatchActionCreator =
  (pathUnranked: string[] | null): Thunk =>
  (dispatch, getState) =>
    dispatch(
      setCursorThunk({
        path: pathUnranked ? contextToPathOrThrow(getState(), pathUnranked, 'setCursorFirstMatch') : null,
      }),
    )

export default _.curryRight(setCursorFirstMatch)
