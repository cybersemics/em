import { store } from '../store.js'
import * as localForage from 'localforage'

// constants
import { SCHEMA_LATEST } from '../constants'

// util
import { contextOf } from './contextOf.js'
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
    settingsDataIntegrityCheck,
    settingsAutologin,
  ] = await Promise.all([
    localForage.getItem('cursor'),
    localForage.getItem('lastUpdated'),
    localForage.getItem('schemaVersion'),
    localForage.getItem('settings-dark'),
    localForage.getItem('settings-dataIntegrityCheck'),
    localForage.getItem('settings-autologin'),
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
  newState.expanded = expandThoughts(contextOf(newState.cursor || []), newState.thoughtIndex, newState.contextIndex, contextViews, newState.cursor ? splitChain(newState.cursor, { state: { thoughtIndex: newState.thoughtIndex, contextViews } }) : [])

  // migrate old { key, rank } and thought.memberOf
  // there was no schemaVersion previously, so its existence serves as a suitable condition
  if (!schemaVersion) {

    const promises = [].concat(

      // contextIndex
      Object.keys(newState.contextIndex).map(key => {
        const contexts = newState.contextIndex[key]
        contexts.forEach(context => {
          context.value = context.value || context.key
          delete context.key // eslint-disable-line fp/no-delete
        })
        return localForage.setItem('contextIndex-' + key, contexts)
      }),

      // thoughtIndex
      Object.keys(newState.thoughtIndex).map(key => {
        const thought = newState.thoughtIndex[key]
        thought.contexts = thought.contexts || thought.memberOf
        delete thought.memberOf // eslint-disable-line fp/no-delete
        return localForage.setItem('thoughtIndex-' + key, thought)
      })

    )

    newState.schemaVersion = SCHEMA_LATEST

    // only update schemaVersion after all contexts have been updated
    Promise.all(promises).then(() => {
      localForage.setItem('schemaVersion', SCHEMA_LATEST)
    })
  }

  store.dispatch({ type: 'loadLocalState', newState })
}
