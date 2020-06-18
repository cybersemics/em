/**
 * @packageDocumentation
 */

import { getHelpers } from '../db'

// action creators
import {
  loadLocalThoughts,
} from '../action-creators'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = () => async (dispatch, getState) => {

  // load from local database
  const {
    lastUpdated,
    recentlyEdited,
  } = await getHelpers()

  const newState = {
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  }

  dispatch({ type: 'loadLocalState', newState })
  await dispatch(loadLocalThoughts())
}

export default loadLocalState
