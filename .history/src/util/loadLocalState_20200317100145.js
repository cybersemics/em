import { store } from '../store.js'
import * as localForage from 'localforage'
import { extendPrototype as localForageGetItems } from 'localforage-getitems'
import { extendPrototype as localForageStartsWith } from 'localforage-startswith'
import { migrate } from '../migrations/index.js'

import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  SCHEMA_LATEST,
} from '../constants.js'

// util
import {
  getThoughts,
  importText,
  isRoot,
  decodeThoughtsUrl,
  expandThoughts,
  sync,
  updateUrlHistory,
} from '../util.js'
import { dbOperations } from '../db.js'

// extend localForage prototype with .getItems and .startsWith
localForageGetItems(localForage)
localForageStartsWith(localForage)

export const loadLocalState = async () => {

  // load from localStorage and localForage
  const {
    cursor,
    lastUpdated,
    recentlyEdited,
    schemaVersion,
  } = await dbOperations.getHelpers()

  const newState = {
    lastUpdated,
    thoughtIndex: {},
    contextIndex: {},
    modals: {},
    recentlyEdited: recentlyEdited || {}
  }

  const thoughtIndexes = await dbOperations.getThoughtIndexes()
  thoughtIndexes.forEach(({ id, ...rest }) => {
    newState.thoughtIndex[id] = rest
  })

  const contextIndexes = await dbOperations.getContextIndexes()
  contextIndexes.forEach(({ id, context }) => {
    newState.contextIndex[id] = context
  })

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

  // if localForage has data but schemaVersion is not defined, it means we are at the SCHEMA_HASHKEYS version
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
      if (getThoughts([EM_TOKEN, 'Settings'], newState.thoughtIndex, newState.contextIndex).length === 0) {
        return importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)
      }
    })
}
