import { HOME_PATH } from '../constants'
import { isRoot, pathToContext } from '../util'
import { importText, setCursor } from '../action-creators'
import { decodeThoughtsUrl, getAllChildren } from '../selectors'
import { Thunk } from '../types'

interface Options {
  skipRoot?: boolean,
}

/**
 * Imports thoughts from the given source url into the given path (default: root).
 *
 * @param skipRoot    See importHtml.
 */
const loadFromUrl = (url: string, path = HOME_PATH, { skipRoot }: Options = {}): Thunk<Promise<void>> => async (dispatch, getState) => {
  const urlWithProtocol = /^http|localhost/.test(url) ? url : 'https://' + url
  const response = await fetch(urlWithProtocol)
  const text = await response.text()

  // prevent the default setCursor behavior of importText so that we can restore the cursor from the url
  dispatch(importText({ path, text, preventSetCursor: true, skipRoot }))

  // decode url after importText so that we are using updated state
  const state = getState()
  const { path: decodedPath } = decodeThoughtsUrl(state, window.location.pathname, { exists: true })

  // set cursor to first child if cursor is not provided via url
  const firstChild = decodedPath
    ? getAllChildren(state, pathToContext(decodedPath))[0]
    : null

  if (decodedPath) {
    dispatch(setCursor({
      path: isRoot(decodedPath)
        ? [firstChild!]
        : decodedPath
    }))
  }
}

export default loadFromUrl
