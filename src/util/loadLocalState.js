import { store } from '../store.js'
import * as localForage from 'localforage'
import { migrate } from '../migrations/index.js'

import {
  EM_TOKEN,
  INITIAL_SETTINGS,
} from '../constants.js'

// util
import {
  importText,
  isRoot,
  decodeThoughtsUrl,
  exists,
  expandThoughts,
  sync,
  updateUrlHistory,
} from '../util.js'

export const loadLocalState = async () => {

  // load from localStorage and localForage
  const [
    contexts,
    cursor,
    lastUpdated,
    recentlyEdited,
    schemaVersion,
  ] = await Promise.all([
    localForage.getItem('contexts'),
    localForage.getItem('cursor'),
    localForage.getItem('lastUpdated'),
    localForage.getItem('recentlyEdited'),
    localForage.getItem('schemaVersion')
  ])

  const newState = {
    contexts: contexts || {},
    lastUpdated,
    thoughtIndex: {},
    contextIndex: {},
    contextBindings: {},
    proseViews: {},
    modals: {},
    recentlyEdited: recentlyEdited || []
  }

  await localForage.iterate((localValue, key, thought) => {
    if (key.startsWith('thoughtIndex-')) {
      const value = key.substring('thoughtIndex-'.length)
      newState.thoughtIndex[value] = localValue
    }
    else if (key.startsWith('contextIndex-')) {
      const value = key.substring('contextIndex-'.length)
      newState.contextIndex[value] = localValue
    }
    else if (key.startsWith('contextBinding-')) {
      const value = key.substring('contextBinding-'.length)
      newState.contextBindings[value] = localValue
    }
    else if (key.startsWith('proseViews-')) {
      const value = key.substring('proseViews-'.length)
      newState.proseViews[value] = localValue
    }
  })

  // if there is no system settings, generate new settings
  const settingsPromise = !exists('Settings', newState.thoughtIndex)
    ? importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS, { preventSync: true })
    : Promise.resolve({})

  return settingsPromise.then(({ thoughtIndexUpdates, contextIndexUpdates }) => {

    // merge initial state
    newState.thoughtIndex = {
      ...thoughtIndexUpdates,
      ...newState.thoughtIndex
    }
    newState.contextIndex = {
      ...contextIndexUpdates,
      ...newState.contextIndex
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
      newState.contexts,
      contextViews,
      []
      // this was incorrectly passing a context chain when no context views were active, preventing only-children from expanding
      // newState.cursor
      //   ? splitChain(newState.cursor, { state: { thoughtIndex: newState.thoughtIndex, contextViews } })
      //   : []
    )

    newState.schemaVersion = schemaVersion

    return migrate(newState).then(newStateMigrated => {

      const { thoughtIndexUpdates, contextIndexUpdates, schemaVersion } = newStateMigrated

      if (schemaVersion > newState.schemaVersion) {
        sync(thoughtIndexUpdates, contextIndexUpdates, { updates: { schemaVersion }, state: false, remote: false, forceRender: true, callback: () => {
          console.info('Migrations complete.')
        } })

        return newStateMigrated
      }
      else {
        return newState
      }
    })
    .then(newState => {
      store.dispatch({ type: 'loadLocalState', newState })
    })
  })
}
