import { store } from '../store.js'
import * as localForage from 'localforage'

// util
import { isRoot } from './isRoot.js'
import { decodeThoughtsUrl } from './decodeThoughtsUrl.js'
import { updateUrlHistory } from './updateUrlHistory.js'
import { splitChain } from './splitChain.js'
import { expandThoughts } from './expandThoughts.js'

export const loadLocalState = async () => {
  const newState = {
    lastUpdated: await localForage.getItem('lastUpdated'),
    settings: {
      dark: await localForage.getItem('settings-dark') || true,
      autologin: await localForage.getItem('settings-autologin') || false,
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

  const restoreCursor = window.location.pathname.length <= 1 && (await localForage.getItem('cursor'))
  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(restoreCursor ? await localForage.getItem('cursor') : window.location.pathname, newState.thoughtIndex)

  if (restoreCursor) {
    updateUrlHistory(thoughtsRanked, { thoughtIndex: newState.thoughtIndex })
  }

  newState.cursor = isRoot(thoughtsRanked) ? null : thoughtsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = newState.cursor ? expandThoughts(newState.cursor, newState.thoughtIndex, newState.contextIndex, contextViews, splitChain(newState.cursor, { state: { thoughtIndex: newState.thoughtIndex, contextViews } })) : {}

  store.dispatch({ type: 'loadLocalState', newState })
}
