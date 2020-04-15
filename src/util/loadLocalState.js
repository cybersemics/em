import { store } from '../store'
import { migrate } from '../migrations/index'
import { getHelpers, getThoughtIndex, getContextIndex } from '../db'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_LATEST,
} from '../constants'

// util
import {
  importText,
  isRoot,
  sync,
  updateUrlHistory,
} from '../util.js'

// selectors
import { decodeThoughtsUrl, expandThoughts } from '../selectors'
import getThoughts from '../selectors/getThoughts'

export const loadLocalState = async () => {

  // load from local database
  const {
    cursor,
    lastUpdated,
    recentlyEdited,
    schemaVersion,
  } = await getHelpers()

  const newState = {
    lastUpdated,
    modals: {},
    recentlyEdited: recentlyEdited || {},
    thoughtIndex: await getThoughtIndex(),
    contextIndex: await getContextIndex()
  }

  const restoreCursor = window.location.pathname.length <= 1 && (cursor)
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(newState, restoreCursor ? cursor : window.location.pathname)

  if (restoreCursor) {
    updateUrlHistory(thoughtsRanked, { thoughtIndex: newState.thoughtIndex, contextIndex: newState.contextIndex })
  }

  newState.cursor = isRoot(thoughtsRanked) ? null : thoughtsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = expandThoughts(
    { ...newState, contextViews },
    newState.cursor || [],
  )

  // if local database has data but schemaVersion is not defined, it means we are at the SCHEMA_HASHKEYS version
  newState.schemaVersion = schemaVersion || SCHEMA_LATEST

  return migrate(newState).then(newStateMigrated => {

    const { thoughtIndexUpdates, contextIndexUpdates, schemaVersion } = newStateMigrated

    if (schemaVersion > newState.schemaVersion) {
      sync(thoughtIndexUpdates, contextIndexUpdates, {
        updates: { schemaVersion }, state: false, remote: false, forceRender: true, callback: () => {
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
      store.dispatch({ type: 'loadLocalState', newState })

      // instantiate initial Settings if it does not exist
      if (getThoughts(newState, [EM_TOKEN, 'Settings']).length === 0) {
        return importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)
      }
    })
}
