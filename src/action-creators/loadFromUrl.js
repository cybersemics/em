import { RANKED_ROOT } from '../constants'

// util
import {
  isRoot,
} from '../util'

// selectors
import {
  decodeThoughtsUrl,
  getThoughts,
} from '../selectors'

import { importText } from '../action-creators'

import { store } from '../store'

/**
 * Imports thoughts from the given source url into the given path (default: root)
 *
 * @param skipRoot    See importHtml.
 */
export default async (url, path = RANKED_ROOT, { skipRoot } = {}) => async (dispatch, getState) => {
  const urlWithProtocol = /^http|localhost/.test(url) ? url : 'https://' + url
  const response = await fetch(urlWithProtocol)
  const text = await response.text()

  // prevent the default setCursor behavior of importText so that we can restore the cursor from the url
  await store.dispatch(importText(path, text, { preventSetCursor: true, skipRoot }))

  // decode url after importText so that we are using updated state
  const state = getState()
  const { thoughtsRanked } = decodeThoughtsUrl(state, window.location.pathname)

  // set cursor to first child if cursor is not provided via url
  const firstChild = getThoughts(state, thoughtsRanked)[0]
  dispatch({
    type: 'setCursor',
    thoughtsRanked: isRoot(thoughtsRanked)
      ? [firstChild]
      : thoughtsRanked
  })
}
