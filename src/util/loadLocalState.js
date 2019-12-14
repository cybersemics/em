import { store } from '../store.js'
import * as localForage from 'localforage'

// util
import { isRoot } from './isRoot.js'
import { decodeItemsUrl } from './decodeItemsUrl.js'
import { updateUrlHistory } from './updateUrlHistory.js'
import { splitChain } from './splitChain.js'
import { expandItems } from './expandItems.js'

export const loadLocalState = async () => {
  const newState = {
    lastUpdated: await localForage.getItem('lastUpdated'),
    settings: {
      dark: await localForage.getItem('settings-dark') || true,
      autologin: await localForage.getItem('settings-autologin') || false,
    },
    data: {},
    contextChildren: {},
    contextBinding: {},
    helpers: {},
  }
  await localForage.iterate((localValue, key, item) => {
    if (key.startsWith('data-')) {
      const value = key.substring(5)
      newState.data[value] = localValue
    }
    else if (key.startsWith('contextChildren-')) {
      const value = key.substring('contextChildren-'.length)
      newState.contextChildren[value] = localValue
    }
    else if (key.startsWith('contextBinding-')) {
      const value = key.substring('contextBinding-'.length)
      newState.contextBindings[value] = localValue
    }
  })

  const restoreCursor = window.location.pathname.length <= 1 && (await localForage.getItem('cursor'))
  const { itemsRanked, contextViews } = decodeItemsUrl(restoreCursor ? await localForage.getItem('cursor') : window.location.pathname, newState.data)

  if (restoreCursor) {
    updateUrlHistory(itemsRanked, { data: newState.data })
  }

  newState.cursor = isRoot(itemsRanked) ? null : itemsRanked
  newState.cursorBeforeEdit = newState.cursor
  newState.contextViews = contextViews
  newState.expanded = newState.cursor ? expandItems(newState.cursor, newState.data, newState.contextChildren, contextViews, splitChain(newState.cursor, { state: { data: newState.data, contextViews } })) : {}

  store.dispatch({ type: 'loadLocalState', newState })
}
