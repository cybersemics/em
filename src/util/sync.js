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

const localStorageSettings = {
  'Font Size': true,
  Tutorial: true,
  Autologin: true,
  'Last Updated': true,
}

/* Update local storage if the value is a setting */
const handleLocalStorageUpdate = (value, thoughtIndexUpdates, contextIndexUpdates) => {
  if (value in localStorageSettings) {
    localStorage.setItem(`Settings/${value}`, getSetting(value, { thoughtIndexUpdates, contextIndexUpdates }))
  }
}

/** Saves thoughtIndex to state, localStorage, and Firebase. */
// assume timestamp has already been updated on thoughtIndexUpdates
export const sync = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, { local = true, remote = true, state = true, forceRender, updates, callback, recentlyEdited } = {}) => {

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
      updateLastUpdated(timestamp())
    ]

    // contextIndex
    const contextIndexPromises = [
      ...Object.keys(contextIndexUpdates).map(contextEncoded => {
        const children = contextIndexUpdates[contextEncoded]
        return (children && children.length > 0
          ? updateContext(contextEncoded, children)
          : deleteContext(contextEncoded))
      }),
      updateLastUpdated(timestamp())
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
