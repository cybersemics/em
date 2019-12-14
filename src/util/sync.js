import { store } from '../store.js'
import * as localForage from 'localforage'
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import { timestamp } from './timestamp.js'
import { syncRemote } from './syncRemote.js'

/** Saves data to state, localStorage, and Firebase. */
// assume timestamp has already been updated on dataUpdates
export const sync = (dataUpdates = {}, contextChildrenUpdates = {}, { local = true, remote = true, state = true, forceRender, updates, callback } = {}) => {

  const lastUpdated = timestamp()

  // state
  // NOTE: state here is a boolean value indicating whether to sync to state
  if (state) {
    store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates, forceRender })
  }

  // localStorage
  if (local) {
    // data
    Object.keys(dataUpdates).forEach(key => {
      if (dataUpdates[key] != null) {
        localForage.setItem('data-' + key, dataUpdates[key])
      }
      else {
        localForage.removeItem('data-' + key)
      }
      localForage.setItem('lastUpdated', lastUpdated)
    })

    // contextChildren
    Object.keys(contextChildrenUpdates).forEach(contextEncoded => {
      const children = contextChildrenUpdates[contextEncoded]
      if (children && children.length > 0) {
        localForage.setItem('contextChildren-' + contextEncoded, children)
      }
      else {
        localForage.removeItem('contextChildren-' + contextEncoded)
      }
      localForage.setItem('lastUpdated', lastUpdated)
    })
  }

  // firebase
  if (remote) {
    syncRemote(dataUpdates, contextChildrenUpdates, updates, callback)
  }
  else {
    // do not let callback outrace re-render
    if (callback) {
      setTimeout(callback, RENDER_DELAY)
    }
  }
}
