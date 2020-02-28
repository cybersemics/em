/* eslint-disable fp/no-mutating-methods */
import { store } from '../store.js'
import * as localForage from 'localforage'
import db from '../initDexie'
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import { timestamp } from './timestamp.js'
import { syncRemote } from './syncRemote.js'

/** Saves thoughtIndex to state, localStorage, and Firebase. */
// assume timestamp has already been updated on thoughtIndexUpdates
export const sync = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, { local = true, remote = true, state = true, forceRender, updates, callback, recentlyEdited } = {}) => {

  const lastUpdated = timestamp()
  console.log('sync', db)
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
  const localPromises = local ? (() => {
    // thoughtIndex
    const thoughtIndexPromises = Object.keys(thoughtIndexUpdates).map(key =>
      [
        thoughtIndexUpdates[key] != null
          ? localForage.setItem('thoughtIndex-' + key, thoughtIndexUpdates[key])
          : localForage.removeItem('thoughtIndex-' + key),
        localForage.setItem('lastUpdated', lastUpdated)
      ]
    )

    // contextIndex
    const contextIndexPromises = Object.keys(contextIndexUpdates).map(contextEncoded => {
      const children = contextIndexUpdates[contextEncoded]
      return [
        children && children.length > 0
          ? localForage.setItem('contextIndex-' + contextEncoded, children)
          : localForage.removeItem('contextIndex-' + contextEncoded),
        localForage.setItem('lastUpdated', lastUpdated)
      ]
    })

    // recentlyEdited
    const recentlyEditedPromise = recentlyEdited
      ? localForage.setItem('recentlyEdited', recentlyEdited)
      : null

    // schemaVersion
    const schemaVersionPromise = updates && updates.schemaVersion
      ? localForage.setItem('schemaVersion', updates.schemaVersion)
      : null

    return [thoughtIndexPromises, contextIndexPromises, recentlyEditedPromise, schemaVersionPromise]
  })()
    : []

  return Promise.all(localPromises).then(() => {

    // firebase
    if (remote) {
      return syncRemote(thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates, callback)
    }
    else {
      // do not let callback outrace re-render
      if (callback) {
        setTimeout(callback, RENDER_DELAY)
      }

      return Promise.resolve()
    }

  })

}
