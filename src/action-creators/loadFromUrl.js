import { RANKED_ROOT } from '../constants'
import { store } from '../store'

import {
  decodeThoughtsUrl,
  getThoughts,
  importText,
  isRoot,
} from '../util'

/* Imports thoughts from the given source url into the given path (default: root)
  @param skipRoot    See importHtml @param.
*/
export default async (url, path = RANKED_ROOT, { skipRoot } = {}) => {
  const urlWithProtocol = /^http|localhost/.test(url) ? url : 'https://' + url
  const response = await fetch(urlWithProtocol)
  const text = await response.text()

  // prevent the default setCursor behavior of importText so that we can restore the cursor from the url
  await importText(path, text, { preventSetCursor: true, skipRoot })

  // decode url after importText so that we are using updated state
  const state = store.getState()
  const { thoughtsRanked } = decodeThoughtsUrl(window.location.pathname, state.thoughtIndex, state.contextIndex)

  // set cursor to first child if cursor is not provided via url
  const firstChild = getThoughts(thoughtsRanked)[0]
  store.dispatch({
    type: 'setCursor',
    thoughtsRanked: isRoot(thoughtsRanked)
      ? [firstChild]
      : thoughtsRanked
  })
}
