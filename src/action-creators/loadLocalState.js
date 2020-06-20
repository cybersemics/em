import * as db from '../data-providers/dexie'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { importText } from '../action-creators'
import { never } from '../util'

// action creators
// import {
//   loadLocalThoughts,
// } from '../action-creators'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = () => async (dispatch, getState) => {

  // TODO: Fix IndexedDB during tests
  const test = process.env.NODE_ENV === 'test'

  // load from local database
  const {
    lastUpdated,
    recentlyEdited,
  } = test ? {} : await db.getHelpers()

  const newState = {
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  }

  dispatch({ type: 'loadLocalState', newState })

  // initialize settings if they don't exist
  const settings = test ? {} : await db.getContext([EM_TOKEN, 'Settings'])
  if (!settings) {
    // set lastUpdated to never so that any settings from remote are used over the initial settings
    return await dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS, {
      lastUpdated: never(),
      preventSetCursor: true,
    }))
  }
}

export default loadLocalState
