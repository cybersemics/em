import { RANKED_ROOT } from '../constants'
import { store } from '../store'

import {
  importText,
  isRoot,
} from '../util'

// selectors
import {
  decodeThoughtsUrl,
  getThoughts,
} from '../selectors'

/* Imports thoughts from the given source url into root */
export default async url => {
  const urlWithProtocol = /^http|localhost/.test(url) ? url : 'https://' + url
  const response = await fetch(urlWithProtocol)
  const text = await response.text()

  // prevent the default setCursor behavior of importText so that we can restore the cursor from the url
  await importText(RANKED_ROOT, text, { preventSetCursor: true })

  // decode url after importText so that we are using updated state
  const state = store.getState()
  const { thoughtsRanked } = decodeThoughtsUrl(state, window.location.pathname)

  // set cursor to first child if cursor is not provided via url
  const firstChild = getThoughts(state, thoughtsRanked)[0]
  store.dispatch({
    type: 'setCursor',
    thoughtsRanked: isRoot(thoughtsRanked)
      ? [firstChild]
      : thoughtsRanked
  })
}
