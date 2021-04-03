import { rankThoughtsFirstMatch } from '../selectors'
import { importText } from '../action-creators'
import { Thunk } from '../types'

/** A thunk that imports texts on the given unranked path. */
export const importOnFirstMatchPathActionCreator = (pathUnranked: string[], text: string): Thunk =>
  (dispatch, getState) => dispatch(importText({
    path: rankThoughtsFirstMatch(getState(), pathUnranked),
    text: text
  }))
