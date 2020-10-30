import * as db from '../data-providers/dexie'
import getContext from '../data-providers/data-helpers/getContext'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import { decodeThoughtsUrl } from '../selectors'
import { never } from '../util'
import { ActionCreator } from '../types'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = (): ActionCreator => async (dispatch, getState) => {

  // load helpers and settings from local database
  const [{
    cursor: localUrl,
    lastUpdated,
    recentlyEdited,
  }, settings] = await Promise.all([
    db.getHelpers() as Promise<db.Helper>,
    getContext(db, [EM_TOKEN, 'Settings'])
  ])

  // restore cursor from local db if url is at root
  const isHome = window.location.pathname.length <= 1
  const decoded = isHome && localUrl
    ? decodeThoughtsUrl(getState(), localUrl)
    : null

  dispatch({
    type: 'loadLocalState',
    contextViews: decoded ? decoded.contextViews : {},
    cursor: decoded ? decoded.path : null,
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  })

  // initialize settings if they don't exist
  if (!settings) {
    // set lastUpdated to never so that any settings from remote are used over the initial settings
    return dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS, {
      lastUpdated: never(),
      preventSetCursor: true,
    }))
  }
}

export default loadLocalState
