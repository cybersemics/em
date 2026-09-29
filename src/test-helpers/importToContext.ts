import Thunk from '../@types/Thunk'
import { importTextActionCreator as importText } from '../actions/importText'
import { HOME_TOKEN } from '../constants'
import contextToPathOrThrow from './contextToPathOrThrow'

function importToContext(text: string): Thunk
function importToContext(pathUnranked: string[], text: string): Thunk

/** A thunk that imports text to the given unranked path. Throws if the path does not resolve. */
function importToContext(pathUnranked: string | string[], text?: string): Thunk {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  return (dispatch, getState) => {
    dispatch(
      importText({
        path: contextToPathOrThrow(getState(), _pathUnranked, 'importToContext'),
        text: _text,
      }),
    )
  }
}

export default importToContext
