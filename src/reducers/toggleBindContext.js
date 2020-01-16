import * as localForage from 'localforage'

// util
import {
  isContextViewActive,
  hashContext,
  lastThoughtsFromContextChain,
  restoreSelection,
  rootedContextOf,
  splitChain,
  sync,
} from '../util.js'

export default state => {

  const { contextBindings, cursor } = state
  if (!cursor) return

  const newContextBindings = { ...contextBindings }

  const contextChain = splitChain(cursor, { state })

  const contextBound = lastThoughtsFromContextChain(contextChain, state)
  const path = rootedContextOf(cursor)

  // context view of parent must be enabled
  if (!isContextViewActive(path, { state })) return

  const encoded = hashContext(path)

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

    restoreSelection(path, { offset: 0 })

  })

  return {
    contextBindings: newContextBindings,
    contextViews,
    cursor: path,
    cursorBeforeEdit: path,
  }
}
