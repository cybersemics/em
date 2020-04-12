/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import { store } from '../store'

// constants
import {
  EM_TOKEN,
  RENDER_DELAY,
} from '../constants'

// util
import {
  hashContext,
  isFunction,
  timestamp,
} from '../util'

// selectors
import { syncRemote } from '../selectors'

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
    const contextIndexPromises = [
      ...Object.keys(contextIndexUpdates).map(contextEncoded => {
        const children = contextIndexUpdates[contextEncoded]

        // some settings are propagated to localStorage for faster load on startup
        const name = localStorageSettingsContexts[contextEncoded]
        if (name) {
          const child = children.find(child => !isFunction(child.value))
          if (child) {
            localStorage.setItem(`Settings/${name}`, child.value)
          }
        }

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
      return syncRemote(state, thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates, callback)
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
