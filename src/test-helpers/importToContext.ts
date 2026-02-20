import Thunk from '../@types/Thunk'
import { importTextActionCreator as importText } from '../actions/importText'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { HOME_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
import { getChildrenRanked } from '../selectors/getChildren'

function importToContext(text: string): Thunk
function importToContext(pathUnranked: string[], text: string): Thunk

/** A thunk that imports text to the given unranked path. Ensures the cursor is on the last root-level thought after import (for deterministic e2e tests). */
function importToContext(pathUnranked: string | string[], text?: string): Thunk {
  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : (pathUnranked as string[])
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  return (dispatch, getState) => {
    const path = contextToPath(getState(), _pathUnranked)
    const isRootImport = path?.length === 1 && path[0] === HOME_TOKEN
    const result = path && dispatch(importText({ path, text: _text }))
    // if it is a root import, explicitly set the cursor to the last root-level thought
    // sometimes in puppeteer tests, the cursor is not set to the last root-level thought after import, so we need to set it explicitly.
    if (result && isRootImport) {
      const state = getState()
      const rootChildren = getChildrenRanked(state, HOME_TOKEN)
      const lastThought = rootChildren[rootChildren.length - 1]
      if (lastThought) {
        dispatch(setCursor({ path: [HOME_TOKEN, lastThought.id] }))
      }
    }
    return result
  }
}

export default importToContext
