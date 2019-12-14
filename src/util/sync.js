import { store } from '../store.js'
import * as localForage from 'localforage'
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import { timestamp } from './timestamp.js'
import { syncRemote } from './syncRemote.js'

/** Saves thoughtIndex to state, localStorage, and Firebase. */
// assume timestamp has already been updated on thoughtIndexUpdates
export const sync = (thoughtIndexUpdates = {}, contextChildrenUpdates = {}, { local = true, remote = true, state = true, forceRender, updates, callback } = {}) => {

  const lastUpdated = timestamp()

  // state
  // NOTE: state here is a boolean value indicating whether to sync to state
  if (state) {
    store.dispatch({ type: 'thoughtIndex', thoughtIndex: thoughtIndexUpdates, contextChildrenUpdates, forceRender })
  }

  // localStorage
  if (local) {
    // thoughtIndex
    Object.keys(thoughtIndexUpdates).forEach(key => {
      if (thoughtIndexUpdates[key] != null) {
        localForage.setItem('thoughtIndex-' + key, thoughtIndexUpdates[key])
      }
      else {
        localForage.removeItem('thoughtIndex-' + key)
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
    syncRemote(thoughtIndexUpdates, contextChildrenUpdates, updates, callback)
  }
  else {
    // do not let callback outrace re-render
    if (callback) {
      setTimeout(callback, RENDER_DELAY)
    }
  }
}
