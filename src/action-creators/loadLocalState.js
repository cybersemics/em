import { migrate } from '../migrations/index'
import { getContextIndex, getHelpers, getThoughtIndex } from '../db'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_LATEST,
} from '../constants'

// util
import {
  isRoot,
  sync,
} from '../util'

// selectors
import {
  decodeThoughtsUrl,
  expandThoughts,
  getThoughts,
} from '../selectors'

// action creators
import { importText } from '../action-creators'

/** Loads the local state from the IndexedDB database. */
const loadLocalState = () => async (dispatch, getState) => {

  // TODO: Fix IndexedDB during tests
  const test = process.env.NODE_ENV === 'test'

  // load from local database
  const {
    cursor,
    lastUpdated,
    recentlyEdited,
    schemaVersion,
  } = test ? {} : await getHelpers()

  const newState = {
    lastUpdated,
    modals: {},
    recentlyEdited: recentlyEdited || {},
    thoughtIndex: test ? {} : await getThoughtIndex(),
    contextIndex: test ? {} : await getContextIndex()
  }

  const restoreCursor = window.location.pathname.length <= 1 && cursor
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(newState, restoreCursor ? cursor : window.location.pathname)

  newState.cursor = isRoot(thoughtsRanked) ? null : thoughtsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = expandThoughts(
    { ...newState, contextViews },
    newState.cursor || []
  )

  // if local database has data but schemaVersion is not defined, it means we are at the SCHEMA_HASHKEYS version
  newState.schemaVersion = schemaVersion || SCHEMA_LATEST

  return migrate(newState).then(newStateMigrated => {

    const { thoughtIndexUpdates, contextIndexUpdates, schemaVersion } = newStateMigrated

    if (schemaVersion > newState.schemaVersion) {
      sync(thoughtIndexUpdates, contextIndexUpdates, {
        updates: { schemaVersion }, remote: false, forceRender: true, callback: () => {
          console.info('Local migrations complete.')
        }
      })

      return newStateMigrated
    }
    else {
      return newState
    }
  })
    .then(newState => {
      dispatch({ type: 'loadLocalState', newState })

      // instantiate initial Settings if it does not exist
      if (getThoughts(newState, [EM_TOKEN, 'Settings']).length === 0) {
        return dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))
      }
    })
}

export default loadLocalState
