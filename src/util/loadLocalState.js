import { store } from '../store.js'
import * as localForage from 'localforage'

// util
import { isRoot } from './isRoot.js'
import { decodeThoughtsUrl } from './decodeThoughtsUrl.js'
import { updateUrlHistory } from './updateUrlHistory.js'
import { splitChain } from './splitChain.js'
import { expandThoughts } from './expandThoughts.js'

export const loadLocalState = async () => {

  // (do not sort alphabetically; relies on order for deconstruction)
  const [
    cursor,
    lastUpdated,
    dark,
    autologin
  ] = await Promise.all([
    localForage.getItem('cursor'),
    localForage.getItem('lastUpdated'),
    localForage.getItem('settings-dark'),
    localForage.getItem('settings-autologin'),
  ])

  const newState = {
    lastUpdated,
    settings: {
      dark: dark || true,
      autologin: autologin || false,
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

  store.dispatch({ type: 'loadLocalState', newState })
}
