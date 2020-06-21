import * as db from '../data-providers/dexie'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import { decodeThoughtsUrl } from '../selectors'
import { never } from '../util'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = () => async (dispatch, getState) => {

  // TODO: Fix IndexedDB during tests
  const test = process.env.NODE_ENV === 'test'

  // load helpers and settings from local database
  const [{
    cursor: localUrl,
    lastUpdated,
    recentlyEdited,
  }, settings] = test ? [{}] : await Promise.all([
    db.getHelpers(),
    db.getContext([EM_TOKEN, 'Settings'])
  ])

  // restore cursor from local db if url is at root
  const isHome = window.location.pathname.length <= 1
  const { contextViews, thoughtsRanked: cursor } = isHome && localUrl
    ? decodeThoughtsUrl(getState(), localUrl)
    : {}

  dispatch({
    type: 'loadLocalState',
    contextViews,
    cursor,
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  })

  // initialize settings if they don't exist
  if (!settings) {
    // set lastUpdated to never so that any settings from remote are used over the initial settings
    return await dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS, {
      lastUpdated: never(),
      preventSetCursor: true,
    }))
  }
}

export default loadLocalState
