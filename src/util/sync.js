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
export const sync = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, { local = true, remote = true, state = true, forceRender, updates, callback,recentlyEdited } = {}) => {

  const lastUpdated = timestamp()

  // state
  // NOTE: state here is a boolean value indicating whether to sync to state
  if (state) {
    store.dispatch({
      type: 'thoughtIndex',
      thoughtIndexUpdates,
      contextIndexUpdates,
      forceRender
    })
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

    // contextIndex
    Object.keys(contextIndexUpdates).forEach(contextEncoded => {
      const children = contextIndexUpdates[contextEncoded]
      if (children && children.length > 0) {
        localForage.setItem('contextIndex-' + contextEncoded, children)
      }
      else {
        localForage.removeItem('contextIndex-' + contextEncoded)
      }
      localForage.setItem('lastUpdated', lastUpdated)
    })

    // recentlyEdited
    if(recentlyEdited) {
      localForage.setItem('recentlyEdited', recentlyEdited)
    }
  }

  // firebase
  if (remote) {
    syncRemote(thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates, callback)
  }
  else {
    // do not let callback outrace re-render
    if (callback) {
      setTimeout(callback, RENDER_DELAY)
    }
  }
}
