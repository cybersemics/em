import { store } from '../store'
import { migrate } from '../migrations/index'

import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_LATEST,
} from '../constants'

// util
import {
  getThoughts,
  importText,
  isRoot,
  decodeThoughtsUrl,
  expandThoughts,
  sync,
  updateUrlHistory,
} from '../util'
import { getHelpers, getThoughtIndex, getContextIndex } from '../db'

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
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(restoreCursor ? cursor : window.location.pathname, newState.thoughtIndex, newState.contextIndex)

  if (restoreCursor) {
    updateUrlHistory(thoughtsRanked, { thoughtIndex: newState.thoughtIndex, contextIndex: newState.contextIndex })
  }

  newState.cursor = isRoot(thoughtsRanked) ? null : thoughtsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = expandThoughts(
    newState.cursor || [],
    newState.thoughtIndex,
    newState.contextIndex,
    contextViews,
    []
  )

  // if local database has data but schemaVersion is not defined, it means we are at the SCHEMA_HASHKEYS version
  newState.schemaVersion = schemaVersion || SCHEMA_LATEST

  const oldState = store.getState()

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
      // merge with current state in case local db was cleared and we are just at initialState
      // otherwise EM_TOKEN will not exist
      if (getThoughts([EM_TOKEN, 'Settings'], {
        ...oldState.thoughtIndex,
        ...newState.thoughtIndex
      }, {
        ...oldState.contextIndex,
        ...newState.contextIndex
      }).length === 0) {
        return importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)
      }
    })
}
