import { rankThoughtsFirstMatch } from '../selectors'
import { importText } from '../action-creators'
import { Thunk } from '../types'

/** A thunk that imports text to the given unranked path. */
const importToContext = (pathUnranked: string[], text: string): Thunk =>
  (dispatch, getState) => dispatch(importText({
    path: rankThoughtsFirstMatch(getState(), pathUnranked),
    text: text
  }))

export default importToContext
