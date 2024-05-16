import Thunk from '../@types/Thunk'
import { importTextActionCreator as importText } from '../actions/importText'
import { HOME_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'

function importToContext(text: string): Thunk
function importToContext(pathUnranked: string[], text: string): Thunk

/** A thunk that imports text to the given unranked path. */
function importToContext(pathUnranked: string | string[], text?: string): Thunk {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  return (dispatch, getState) => {
    const path = contextToPath(getState(), _pathUnranked)
    return (
      path &&
      dispatch(
        importText({
          path,
          text: _text,
        }),
      )
    )
  }
}

export default importToContext
