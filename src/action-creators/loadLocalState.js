import { getHelpers } from '../data-providers/dexie'

// action creators
import {
  loadLocalThoughts,
} from '../action-creators'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = () => async (dispatch, getState) => {

  // TODO: Fix IndexedDB during tests
  const test = process.env.NODE_ENV === 'test'

  // load from local database
  const {
    lastUpdated,
    recentlyEdited,
  } = test ? {} : await getHelpers()

  const newState = {
    lastUpdated,
    recentlyEdited: recentlyEdited || {},
  }

  dispatch({ type: 'loadLocalState', newState })
  await dispatch(loadLocalThoughts())
}

export default loadLocalState
