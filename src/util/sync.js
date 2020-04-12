/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import { store } from '../store'
import * as db from '../db'

// constants
import {
  EM_TOKEN,
  RENDER_DELAY,
} from '../constants'

// util
import {
  hashContext,
  isDocumentEditable,
  isFunction,
  timestamp,
} from '../util'

// selectors
import { syncRemote } from '../selectors'

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
  // disable localStorage if document is not editable
  const localPromises = local && isDocumentEditable() ? (() => {

    // thoughtIndex
    const thoughtIndexPromises = [
      ...Object.entries(thoughtIndexUpdates).map(([key, thought]) => {
        if (thought != null) {
          return db.updateThought(key, thought)
        }
        return db.deleteThought(key)
      }),
      db.updateLastUpdated(timestamp())
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
          ? db.updateContext(contextEncoded, children)
          : db.deleteContext(contextEncoded))
      }),
      db.updateLastUpdated(timestamp())
    ]

    // recentlyEdited
    const recentlyEditedPromise = recentlyEdited
      ? db.updateRecentlyEdited(recentlyEdited)
      : null

    // schemaVersion
    const schemaVersionPromise = updates && updates.schemaVersion
      ? db.updateSchemaVersion(updates.schemaVersion)
      : null

    return [...thoughtIndexPromises, ...contextIndexPromises, recentlyEditedPromise, schemaVersionPromise]
  })()
    : []

  return Promise.all(localPromises).then(() => {
    // firebase
    if (isDocumentEditable() && remote) {
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
