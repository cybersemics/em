import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import removeMulticursor, { removeMulticursorActionCreator } from '../actions/removeMulticursor'
import contextToPathOrThrow from './contextToPathOrThrow'

/** A reducer that removes a multicursor at the first match of the given unranked path. Throws if the path does not resolve. */
const removeMulticursorAtFirstMatch = (state: State, pathUnranked: string[]): State =>
  removeMulticursor(state, { path: contextToPathOrThrow(state, pathUnranked, 'removeMulticursorAtFirstMatch') })

/** A Thunk that removes a multicursor at the first match of the given unranked path. Throws if the path does not resolve. */
export const removeMulticursorAtFirstMatchActionCreator =
  (pathUnranked: string[]): Thunk =>
  (dispatch, getState) => {
    const path = contextToPathOrThrow(getState(), pathUnranked, 'removeMulticursorAtFirstMatch')

    dispatch(removeMulticursorActionCreator({ path }))
  }

export default _.curryRight(removeMulticursorAtFirstMatch)
