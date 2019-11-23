// util
import {
  encodeItems,
  intersections,
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

  // const showContexts = isContextViewActive(unrank(intersections(cursor)), { state: store.getState() })
  const contextChain = splitChain(cursor, { state })
  const contextBound = lastItemsFromContextChain(contextChain, state)

  const contextRanked = intersections(cursor)
  const encoded = encodeItems(unrank(contextRanked))

  if (encoded in newContextBindings) {
    delete newContextBindings[encoded]
    delete localStorage['contextBinding-' + encoded]
  }
  else {
    newContextBindings[encoded] = contextBound
    localStorage['contextBinding-' + encoded] = JSON.stringify(contextBound)
  }

  const contextViews = { ...state.contextViews }
  delete contextViews[encoded]

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
