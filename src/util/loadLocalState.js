import { store } from '../store.js'
import * as localForage from 'localforage'
import { migrate } from '../migrations/index.js'

// util
import { isRoot } from './isRoot.js'
import { decodeThoughtsUrl } from './decodeThoughtsUrl.js'
import { expandThoughts } from './expandThoughts.js'
import { sync } from './sync.js'
import { updateUrlHistory } from './updateUrlHistory.js'
// import { splitChain } from './splitChain.js'

export const loadLocalState = async () => {

  const [
    cursor,
    lastUpdated,
    schemaVersion,
    settingsDark,
    settingsDataIntegrityCheck,
    settingsAutologin,
    pinnedThought
  ] = await Promise.all([
    localForage.getItem('cursor'),
    localForage.getItem('lastUpdated'),
    localForage.getItem('schemaVersion'),
    localForage.getItem('settings-dark'),
    localForage.getItem('settings-dataIntegrityCheck'),
    localForage.getItem('settings-autologin'),
    localForage.getItem('pinnedThought'),
  ])

  const newState = {
    lastUpdated,
    settings: {
      dark: settingsDark || true,
      dataIntegrityCheck: settingsDataIntegrityCheck || false,
      autologin: settingsAutologin || false,
    },
    thoughtIndex: {},
    contextIndex: {},
    contextBindings: {},
    proseViews: {},
    modals: {},
    recentlyEdited: []
  }

  const recentlyEdited = await localForage.getItem('recentlyEdited')
  newState.recentlyEdited = recentlyEdited || []

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

  const restoreCursor = window.location.pathname.length <= 1 && (cursor)
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(restoreCursor ? cursor : window.location.pathname, newState.thoughtIndex)

  if (restoreCursor) {
    updateUrlHistory(thoughtsRanked, { thoughtIndex: newState.thoughtIndex })
  }

  newState.cursor = isRoot(thoughtsRanked) ? null : thoughtsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = expandThoughts(
    newState.cursor || [],
    newState.thoughtIndex,
    newState.contextIndex,
    contextViews,
    [],
    // this was incorrectly passing a context chain when no context views were active, preventing only-children from expanding
    // newState.cursor
    //   ? splitChain(newState.cursor, { state: { thoughtIndex: newState.thoughtIndex, contextViews } })
    //   : [],
    { pinnedThought }
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
}
