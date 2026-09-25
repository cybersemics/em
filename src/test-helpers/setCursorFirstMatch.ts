import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import setCursor, { setCursorActionCreator as setCursorThunk } from '../actions/setCursor'
import command from '../util/command'
import contextToPathOrThrow from './contextToPathOrThrow'

/** A reducer that sets the cursor to the given unranked path, or clears the cursor when passed null. Throws if a non-null path does not resolve. */
const setCursorFirstMatch = (state: State, pathUnranked: string[] | null, document?: ThoughtspaceTransaction): State =>
  setCursor(
    state,
    {
      path: pathUnranked ? contextToPathOrThrow(state, pathUnranked, 'setCursorFirstMatch') : null,
    },
    document,
  )

/** A Thunk that sets the cursor to the given unranked path, or clears the cursor when passed null. Throws if a non-null path does not resolve. */
export const setCursorFirstMatchActionCreator =
  (pathUnranked: string[] | null): Thunk =>
  (dispatch, getState) =>
    dispatch(
      setCursorThunk({
        path: pathUnranked ? contextToPathOrThrow(getState(), pathUnranked, 'setCursorFirstMatch') : null,
      }),
    )

export default command(setCursorFirstMatch)
