import { rankThoughtsFirstMatch } from '../selectors'
import { importText } from '../action-creators'
import { Thunk } from '../@types'
import { HOME_TOKEN } from '../constants'

function importToContext(text: string): Thunk
function importToContext(pathUnranked: string[], text: string): Thunk

/** A thunk that imports text to the given unranked path. */
function importToContext(pathUnranked: string | string[], text?: string): Thunk {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  return (dispatch, getState) =>
    dispatch(
      importText({
        path: rankThoughtsFirstMatch(getState(), _pathUnranked),
        text: _text,
      }),
    )
}

export default importToContext
