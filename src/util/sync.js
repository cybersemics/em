/* eslint-disable fp/no-mutating-methods */
import { store } from '../store.js'
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import { timestamp } from './timestamp.js'
import { syncRemote } from './syncRemote.js'
import { updateThought, deleteThought, updateLastUpdated, updateContext, deleteContext, updateRecentlyEdited, updateSchemaVersion } from '../db'
import { getSetting } from './getSetting.js'

/** Saves thoughtIndex to state, localStorage, and Firebase. */
// assume timestamp has already been updated on thoughtIndexUpdates

const handleLocalStorageUpdate = (context, thoughtIndex, contextIndex) => {
  const localStorageSettings = ['Font Size', 'Tutorial', 'Autologin', 'Last Updated']
  if (localStorageSettings.includes(context)) {
    localStorage.setItem(`Settings/${context}`, getSetting(context, { thoughtIndex, contextIndex, depth: 0 }))
  }
}

export const sync = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, { local = true, remote = true, state = true, forceRender, updates, callback, recentlyEdited } = {}) => {

  const lastUpdated = timestamp()
  // state
  // NOTE: state here is a boolean value indicating whether to sync to state
  if (state) {
    store.dispatch(({
      type: 'thoughtIndex',
      thoughtIndexUpdates,
      contextIndexUpdates,
      forceRender
    }))
  }

  // localStorage
  const localPromises = local ? (() => {
    // thoughtIndex

    const thoughtIndexPromises = [
      ...Object.entries(thoughtIndexUpdates).map(([key, thought]) => {
        if (thought != null) {
          // this makes the map function impure
          handleLocalStorageUpdate(thought.value, thoughtIndexUpdates, contextIndexUpdates)
          return updateThought(key, thought)
        }
        return deleteThought(key)
      }),
      updateLastUpdated(lastUpdated)
    ]

    // contextIndex
    const contextIndexPromises = [
      ...Object.keys(contextIndexUpdates).map(contextEncoded => {
        const children = contextIndexUpdates[contextEncoded]
        return (children && children.length > 0
          ? updateContext(contextEncoded, children)
          : deleteContext(contextEncoded))
      }),
      updateLastUpdated(lastUpdated)
    ]

    // recentlyEdited
    const recentlyEditedPromise = recentlyEdited
      ? updateRecentlyEdited(recentlyEdited)
      : null

    // schemaVersion
    const schemaVersionPromise = updates && updates.schemaVersion
      ? updateSchemaVersion(updates.schemaVersion)
      : null

    return [...thoughtIndexPromises, ...contextIndexPromises, recentlyEditedPromise, schemaVersionPromise]
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
