import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import addMulticursor, { addMulticursorActionCreator } from '../actions/addMulticursor'
import contextToPathOrThrow from './contextToPathOrThrow'

/** A reducer that adds a multicursor at the first match of the given unranked path. Throws if the path does not resolve. */
const addMulticursorAtFirstMatch = (state: State, pathUnranked: string[]): State =>
  addMulticursor(state, { path: contextToPathOrThrow(state, pathUnranked, 'addMulticursorAtFirstMatch') })

/** A Thunk that adds a multicursor at the first match of the given unranked path. Throws if the path does not resolve. */
export const addMulticursorAtFirstMatchActionCreator =
  (pathUnranked: string[]): Thunk =>
  (dispatch, getState) => {
    const path = contextToPathOrThrow(getState(), pathUnranked, 'addMulticursorAtFirstMatch')

    dispatch(addMulticursorActionCreator({ path }))
  }

export default _.curryRight(addMulticursorAtFirstMatch)
