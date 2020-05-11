/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import * as db from '../db'
import { store } from '../store'
import { clientId } from '../browser'

// constants
import {
  EMPTY_TOKEN,
  EM_TOKEN,
  RENDER_DELAY,
} from '../constants'

// util
import {
  hashContext,
  isDocumentEditable,
  isFunction,
  reduceObj,
  timestamp,
} from '../util'

// selectors {
import {
  getSetting,
} from '../selectors'

// store the hashes of the localStorage Settings contexts for quick lookup
// settings that are propagated to localStorage for faster load on startup
// e.g. {
//   [hashContext([EM_TOKEN, 'Settings', 'Tutorial'])]: 'Tutorial',
//   ...
// }
const localStorageSettingsContexts = _.keyBy(
  ['Font Size', 'Tutorial', 'Last Updated'],
  value => hashContext([EM_TOKEN, 'Settings', value])
)

/** prepends thoughtIndex and contextIndex keys for syncing to Firebase */
const syncRemote = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, recentlyEdited, updates = {}, callback) => {

  const state = store.getState()

  const hasUpdates =
    Object.keys(thoughtIndexUpdates).length > 0 ||
    Object.keys(contextIndexUpdates).length > 0 ||
    Object.keys(updates).length > 0

  // prepend thoughtIndex/ and encode key
  const prependedDataUpdates = reduceObj(thoughtIndexUpdates, (key, thought) => {
    return key ? {
      // fix undefined/NaN rank
      ['thoughtIndex/' + (key || EMPTY_TOKEN)]: thought && getSetting(state, 'Data Integrity Check') === 'On'
        ? {
          lastUpdated: thought.lastUpdated || timestamp(),
          value: thought.value,
          contexts: thought.contexts.map(cx => ({
            context: cx.context || null, // guard against NaN or undefined
            rank: cx.rank || 0, // guard against NaN or undefined
            ...(cx.lastUpdated ? {
              lastUpdated: cx.lastUpdated
            } : null)
          }))
        }
        : thought
    } : console.error('Unescaped empty key', thought, new Error()) || {}
  }
  )
  const prependedcontextIndexUpdates = reduceObj(contextIndexUpdates, (key, subthoughts) => ({
    // fix undefined/NaN rank
    ['contextIndex/' + key]: subthoughts && getSetting(state, 'Data Integrity Check') === 'On'
      ? subthoughts.map(subthought => ({
        value: subthought.value || '', // guard against NaN or undefined,
        rank: subthought.rank || 0, // guard against NaN or undefined
        ...(subthought.lastUpdated ? {
          lastUpdated: subthought.lastUpdated
        } : null)
      }))
      : subthoughts
  }))

  // add updates to queue appending clientId and timestamp
  const allUpdates = {
    // encode keys for firebase
    ...(hasUpdates ? {
      ...updates,
      ...prependedDataUpdates,
      ...prependedcontextIndexUpdates,
      ...(recentlyEdited ? { recentlyEdited } : null),
      // do not update lastClientId and lastUpdated if there are no thoughtIndex updates (e.g. just a settings update)
      // there are some trivial settings updates that get pushed to the remote when the app loads, setting lastClientId and lastUpdated, which can cause the client to ignore thoughtIndex updates from the remote thinking it is already up-to-speed
      // TODO: A root level lastClientId/lastUpdated is an overreaching solution.
      ...(Object.keys(thoughtIndexUpdates).length > 0 ? {
        lastClientId: clientId,
        lastUpdated: timestamp()
      } : null)
    } : {})
  }

  // if authenticated, execute all updates
  if (state.authenticated && Object.keys(allUpdates).length > 0) {

    return new Promise((resolve, reject) => {

      // update may throw if updates do not validate
      try {

        state.userRef.update(allUpdates, (err, ...args) => {

          if (err) {
            store.dispatch({ type: 'error', value: err })
            console.error(err, allUpdates)
            reject(err)
          }

          if (callback) {
            callback(err, ...args)
          }

          resolve(args)

        })
      }
      catch (e) {
        store.dispatch({ type: 'error', value: e.message })
        console.error(e.message, allUpdates)
        reject(e)
      }
    })
  }
  // invoke callback asynchronously whether online or not in order to not outrace re-render
  else if (callback) {
    setTimeout(() => callback(null), RENDER_DELAY)
    return Promise.resolve()
  }
}

/**
 * Saves thoughtIndex to local database and Firebase.
 * Assume timestamp has already been updated on thoughtIndexUpdates.
 */
export const sync = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, { local = true, remote = true, forceRender, updates, callback, recentlyEdited } = {}) => {

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
