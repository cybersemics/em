import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import toggleMulticursor, { toggleMulticursorActionCreator } from '../actions/toggleMulticursor'
import contextToPathOrThrow from './contextToPathOrThrow'

/** A reducer that toggles a multicursor at the first match of the given unranked path, as a long press or a tap during a multiselect does. Throws if the path does not resolve. */
const toggleMulticursorAtFirstMatch = (state: State, pathUnranked: string[]): State =>
  toggleMulticursor(state, { path: contextToPathOrThrow(state, pathUnranked, 'toggleMulticursorAtFirstMatch') })

/** A Thunk that toggles a multicursor at the first match of the given unranked path, as a long press or a tap during a multiselect does. Throws if the path does not resolve. */
export const toggleMulticursorAtFirstMatchActionCreator =
  (pathUnranked: string[]): Thunk =>
  (dispatch, getState) => {
    const path = contextToPathOrThrow(getState(), pathUnranked, 'toggleMulticursorAtFirstMatch')

    dispatch(toggleMulticursorActionCreator({ path }))
  }

export default _.curryRight(toggleMulticursorAtFirstMatch)
