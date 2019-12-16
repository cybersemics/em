import { store } from '../store.js'
import * as localForage from 'localforage'

// constants
import { SCHEMA_LATEST } from '../constants'

// util
import { isRoot } from './isRoot.js'
import { decodeThoughtsUrl } from './decodeThoughtsUrl.js'
import { updateUrlHistory } from './updateUrlHistory.js'
import { splitChain } from './splitChain.js'
import { expandThoughts } from './expandThoughts.js'

export const loadLocalState = async () => {

  const [
    cursor,
    lastUpdated,
    schemaVersion,
    settingsDark,
    settingsAutologin,
  ] = await Promise.all([
    localForage.getItem('cursor'),
    localForage.getItem('lastUpdated'),
    localForage.getItem('schemaVersion'),
    localForage.getItem('settings-dark'),
    localForage.getItem('settings-autologin'),
  ])

  const newState = {
    lastUpdated,
    settings: {
      dark: settingsDark || true,
      autologin: settingsAutologin || false,
    },
    thoughtIndex: {},
    contextIndex: {},
    contextBinding: {},
    proseViews: {},
    modals: {},
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

  const restoreCursor = window.location.pathname.length <= 1 && (cursor)
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(restoreCursor ? cursor : window.location.pathname, newState.thoughtIndex)

  if (restoreCursor) {
    updateUrlHistory(thoughtsRanked, { thoughtIndex: newState.thoughtIndex })
  }

  newState.cursor = isRoot(thoughtsRanked) ? null : thoughtsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = newState.cursor ? expandThoughts(newState.cursor, newState.thoughtIndex, newState.contextIndex, contextViews, splitChain(newState.cursor, { state: { thoughtIndex: newState.thoughtIndex, contextViews } })) : {}

  // migrate old { key, rank } to { value, rank }
  // there was no schemaVersion previously, so its existence serves as a suitable condition
  if (!schemaVersion) {

    console.info('Migrating local { key, rank } to { value, rank }...')

    let promises = []
    for (let key in newState.contextIndex) {
      const contexts = newState.contextIndex[key]
      contexts.forEach(context => {
        context.value = context.value || context.key
        delete context.key
      })
      promises.push(localForage.setItem('contextIndex-' + key, contexts))
    }

    newState.schemaVersion = SCHEMA_LATEST

    // only update schemaVersion after all contexts have been updated
    Promise.all(promises).then(() => {
      localForage.setItem('schemaVersion', SCHEMA_LATEST).then(() => {
        console.info('Migration complete')
      })
    })
  }

  store.dispatch({ type: 'loadLocalState', newState })
}
