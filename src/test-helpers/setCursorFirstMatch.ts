import _ from 'lodash'
import { setCursor } from '../reducers'
import { rankThoughtsFirstMatch } from '../selectors'
import { State } from '../util/initialState'
import { ActionCreator, Context } from '../types'

/** A reducer that sets the cursor to the given unranked path. Uses rankThoughtsFirstMatch. */
const setCursorFirstMatch = (state: State, pathUnranked: string[]): State =>
  setCursor(state, {
    path: rankThoughtsFirstMatch(state, pathUnranked),
  })

/** An ActionCreator that sets the cursor to the given unranked path. */
export const setCursorFirstMatchActionCreator = (pathUnranked: string[]): ActionCreator =>
  (dispatch, getState) => dispatch({
    type: 'setCursor',
    path: rankThoughtsFirstMatch(getState(), pathUnranked)
  })

export default _.curryRight(setCursorFirstMatch)
