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

// extend localForage prototype with .getItems and .startsWith
localForageGetItems(localForage)
localForageStartsWith(localForage)

const THOUGHTINDEX_KEY_START = 'thoughtIndex-'.length
const CONTEXTINDEX_KEY_START = 'contextIndex-'.length

export const loadLocalState = async () => {

  // load from localStorage and localForage
  const {
    cursor,
    lastUpdated,
    recentlyEdited,
    schemaVersion,
  } = await localForage.getItems([
    'cursor',
    'lastUpdated',
    'recentlyEdited',
    'schemaVersion',
  ])

  const newState = {
    lastUpdated,
    thoughtIndex: {},
    contextIndex: {},
    modals: {},
    recentlyEdited: recentlyEdited || { [EM_TOKEN]: {} }
  }

  await localForage.startsWith('thoughtIndex-').then(results => {
    for (const key in results) { // eslint-disable-line fp/no-loops
      const value = results[key]
      const hash = key.substring(THOUGHTINDEX_KEY_START)
      newState.thoughtIndex[hash] = value
    }
  })

  await localForage.startsWith('contextIndex-').then(results => {
    for (const key in results) { // eslint-disable-line fp/no-loops
      const value = results[key]
      const hash = key.substring(CONTEXTINDEX_KEY_START)
      newState.contextIndex[hash] = value
    }
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
