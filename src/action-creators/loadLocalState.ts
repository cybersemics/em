import * as db from '../data-providers/dexie'
import getContext from '../data-providers/data-helpers/getContext'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import { never } from '../util'
import { Thunk } from '../types'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = (): Thunk<Promise<void>> => async dispatch => {

  // load helpers and settings from local database
  const [{
    lastUpdated,
    recentlyEdited,
  }, settings] = await Promise.all([
    db.getHelpers() as Promise<db.Helper>,
    getContext(db, [EM_TOKEN, 'Settings'])
  ])

  dispatch({
    type: 'loadLocalState',
    contextViews: {},
    cursor: null,
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  })

  // initialize settings if they don't exist
  if (!settings) {
    // set lastUpdated to never so that any settings from remote are used over the initial settings
    return dispatch(importText({
      path: [{ value: EM_TOKEN, rank: 0 }],
      text: INITIAL_SETTINGS,
      lastUpdated: never(),
      preventSetCursor: true,
    }))
  }
}

export default loadLocalState
