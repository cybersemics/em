import * as localForage from 'localforage'

// util
import {
  hashContext,
  contextOf,
  lastItemsFromContextChain,
  restoreSelection,
  splitChain,
  sync,
  unrank,
} from '../util.js'

export const toggleBindContext = state => {

  const { contextBindings, cursor } = state
  if (!cursor) return

  const newContextBindings = { ...contextBindings }

  // const showContexts = isContextViewActive(unrank(contextOf(cursor)), { state: store.getState() })
  const contextChain = splitChain(cursor, { state })
  const contextBound = lastItemsFromContextChain(contextChain, state)

  const contextRanked = contextOf(cursor)
  const encoded = hashContext(unrank(contextRanked))

  if (encoded in newContextBindings) {
    delete newContextBindings[encoded] // eslint-disable-line fp/no-delete
    localForage.removeItem('contextBinding-' + encoded)
  }
  else {
    newContextBindings[encoded] = contextBound
    localForage.setItem('contextBinding-' + encoded, contextBound)
  }

  const contextViews = { ...state.contextViews }
  delete contextViews[encoded] // eslint-disable-line fp/no-delete

  setTimeout(() => {

    sync({}, {}, {
      contextBindings: newContextBindings
    }, { state: false })

    restoreSelection(contextRanked, { offset: 0 })

  })

  return {
    contextBindings: newContextBindings,
    contextViews,
    cursor: contextRanked,
    cursorBeforeEdit: contextRanked,
  }
}
