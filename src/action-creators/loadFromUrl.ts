import { RANKED_ROOT } from '../constants'
import { isRoot, pathToContext } from '../util'
import { decodeThoughtsUrl, getAllChildren } from '../selectors'
import { importText } from '../action-creators'
import { ActionCreator } from '../types'

interface Options {
  skipRoot?: boolean,
}

/**
 * Imports thoughts from the given source url into the given path (default: root).
 *
 * @param skipRoot    See importHtml.
 */
const loadFromUrl = (url: string, path = RANKED_ROOT, { skipRoot }: Options = {}): ActionCreator => async (dispatch, getState) => {
  const urlWithProtocol = /^http|localhost/.test(url) ? url : 'https://' + url
  const response = await fetch(urlWithProtocol)
  const text = await response.text()

  // prevent the default setCursor behavior of importText so that we can restore the cursor from the url
  await dispatch(importText(path, text, { preventSetCursor: true, skipRoot }))

  // decode url after importText so that we are using updated state
  const state = getState()
  const { path: decodedPath } = decodeThoughtsUrl(state, window.location.pathname)

  // set cursor to first child if cursor is not provided via url
  const firstChild = getAllChildren(state, pathToContext(decodedPath))[0]
  dispatch({
    type: 'setCursor',
    path: isRoot(decodedPath)
      ? [firstChild]
      : decodedPath
  })
}

export default loadFromUrl
