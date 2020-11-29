import _ from 'lodash'
import { setCursor } from '../reducers'
import { rankThoughtsFirstMatch } from '../selectors'
import { setCursor as setCursorThunk } from '../action-creators'
import { State } from '../util/initialState'
import { Thunk } from '../types'

/** A reducer that sets the cursor to the given unranked path. Uses rankThoughtsFirstMatch. */
const setCursorFirstMatch = (state: State, pathUnranked: string[]): State =>
  setCursor(state, {
    path: rankThoughtsFirstMatch(state, pathUnranked),
  })

/** A Thunk that sets the cursor to the given unranked path. */
export const setCursorFirstMatchActionCreator = (pathUnranked: string[]): Thunk =>
  (dispatch, getState) => dispatch(setCursorThunk({
    path: rankThoughtsFirstMatch(getState(), pathUnranked)
  }))

export default _.curryRight(setCursorFirstMatch)
