/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import { store } from '../store.js'

// constants
import {
  EM_TOKEN,
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  hashContext,
  isFunction,
  syncRemote,
  timestamp,
} from '../util.js'

// db
import {
  deleteContext,
  deleteThought,
  updateContext,
  updateLastUpdated,
  updateRecentlyEdited,
  updateSchemaVersion,
  updateThought,
} from '../db'

// store the hashes of the localStorage Settings contexts for quick lookup
// settings that are propagated to localStorage for faster load on startup
// e.g. {
//   [hashContext([EM_TOKEN, 'Settings', 'Tutorial'])]: 'Tutorial',
//   ...
// }
const localStorageSettingsContexts = _.keyBy(
  ['Font Size', 'Tutorial', 'Autologin', 'Last Updated'],
  value => hashContext([EM_TOKEN, 'Settings', value])
)

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
          return updateThought(key, thought)
        }
        return deleteThought(key)
      }),
      updateLastUpdated(timestamp())
    ]

    // contextIndex
    console.log('\nSYNC')
    const contextIndexPromises = [
      ...Object.entries(contextIndexUpdates).map(([key, child]) => {
        console.log('key', key)
        console.log('child', child)
        // const contextIndexEntry = contextIndexUpdates[contextEncoded]
        const contextEncoded = ''
        const contextIndexEntry = {}

        // some settings are propagated to localStorage for faster load on startup
        const name = localStorageSettingsContexts[contextEncoded]
        if (name) {
          const child = contextIndexEntry.thoughts.find(child => !isFunction(child.value))
          if (child) {
            localStorage.setItem(`Settings/${name}`, child.value)
          }
        }

        return (child && contextIndexEntry.thoughts && contextIndexEntry.thoughts.length > 0
        // return (child && contextIndexEntry.thoughts.length > 0
          ? updateContext(contextEncoded, contextIndexEntry)
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
