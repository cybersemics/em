/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { clientId } from '../browser'
import { EMPTY_TOKEN, EM_TOKEN } from '../constants'
import { getSetting } from '../selectors'
import { getUserRef, hashContext, isFunction, logWithTime, timestamp } from '../util'
import { error } from '../action-creators'
import { Thunk, Index, Lexeme, Parent } from '../types'

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

/** Syncs thought updates to the local database. */
const pushLocal = (thoughtIndexUpdates: Index<Lexeme> = {}, contextIndexUpdates: Index<Parent> = {}, recentlyEdited: Index, updates: Index = {}): Promise<any> => {

  // thoughtIndex
  const thoughtIndexPromises = [
    ...Object.entries(thoughtIndexUpdates).map(([key, thought]) => {
      if (thought != null) {
        return db.updateThought(key, thought)
      }
      return db.deleteThought(key)
    }),
    db.updateLastUpdated(timestamp())
  ] as Promise<any>[]

  logWithTime('sync: thoughtIndexPromises generated')

  // contextIndex
  const contextIndexPromises = [
    ...Object.keys(contextIndexUpdates).map(contextEncoded => {
      const parentEntry = contextIndexUpdates[contextEncoded] || {}

      // some settings are propagated to localStorage for faster load on startup
      const name = localStorageSettingsContexts[contextEncoded]
      if (name) {
        const firstChild = parentEntry.children && parentEntry.children.find(child => !isFunction(child.value))
        if (firstChild) {
          localStorage.setItem(`Settings/${name}`, firstChild.value)
        }
      }

      return parentEntry.children && parentEntry.children.length > 0
        ? db.updateContext(contextEncoded, parentEntry)
        : db.deleteContext(contextEncoded)
    }),
    db.updateLastUpdated(timestamp())
  ]

  logWithTime('sync: contextIndexPromises generated')

  // recentlyEdited
  const recentlyEditedPromise = recentlyEdited
    ? db.updateRecentlyEdited(recentlyEdited)
    : null

  // schemaVersion
  const schemaVersionPromise = updates && updates.schemaVersion
    ? db.updateSchemaVersion(updates.schemaVersion)
    : null

  logWithTime('sync: localPromises generated')

  return Promise.all([
    ...thoughtIndexPromises,
    ...contextIndexPromises,
    recentlyEditedPromise,
    schemaVersionPromise,
  ])
}

/** Prepends thoughtIndex and contextIndex keys for syncing to Firebase. */
const pushRemote = (thoughtIndexUpdates: Index<Lexeme | null> = {}, contextIndexUpdates: Index<Parent | null> = {}, recentlyEdited: Index | undefined, updates: Index = {}): Thunk<Promise<unknown>> => async (dispatch, getState) => {

  const state = getState()

  const hasUpdates =
    Object.keys(thoughtIndexUpdates).length > 0 ||
    Object.keys(contextIndexUpdates).length > 0 ||
    Object.keys(updates).length > 0

  // prepend thoughtIndex/ and encode key
  const prependedDataUpdates = _.transform(thoughtIndexUpdates, (accum: Index<Lexeme | null>, thought: Lexeme | null, key: string) => {
    if (!key) {
      console.error('Unescaped empty key', thought, new Error())
      return
    }

    // fix undefined/NaN rank
    accum['thoughtIndex/' + (key || EMPTY_TOKEN)] = thought && getSetting(state, 'Data Integrity Check') === 'On'
      ? {
        value: thought.value,
        contexts: thought.contexts.map(cx => ({
          context: cx.context || null, // guard against NaN or undefined
          rank: cx.rank || 0, // guard against NaN or undefined
          ...cx.lastUpdated ? {
            lastUpdated: cx.lastUpdated
          } : null
        })),
        created: thought.created || timestamp(),
        lastUpdated: thought.lastUpdated || timestamp(),
      }
      : thought
  }, {} as Index<Lexeme | null>)

  logWithTime('pushRemote: prepend thoughtIndex key')

  const dataIntegrityCheck = getSetting(state, 'Data Integrity Check') === 'On'
  const prependedContextIndexUpdates = _.transform(contextIndexUpdates, (accum, parentContext, key) => {
    // fix undefined/NaN rank
    const children = parentContext && parentContext.children
    accum['contextIndex/' + key] = children && children.length > 0
      ? {
        context: parentContext!.context,
        children: dataIntegrityCheck
          ? children.map(subthought => ({
            value: subthought.value || '', // guard against NaN or undefined,
            rank: subthought.rank || 0, // guard against NaN or undefined
            ...subthought.lastUpdated ? {
              lastUpdated: subthought.lastUpdated
            } : null
          }))
          : children,
        lastUpdated: parentContext!.lastUpdated || timestamp(),
      }
      : null
  }, {} as Index<Parent | null>)

  logWithTime('pushRemote: prepend contextIndex key')

  // add updates to queue appending clientId and timestamp
  const allUpdates = {
    // encode keys for firebase
    ...hasUpdates ? {
      ...updates,
      ...prependedDataUpdates,
      ...prependedContextIndexUpdates,
      ...recentlyEdited ? { recentlyEdited } : null,
      // do not update lastClientId and lastUpdated if there are no thoughtIndex updates (e.g. just a settings update)
      // there are some trivial settings updates that get pushed to the remote when the app loads, setting lastClientId and lastUpdated, which can cause the client to ignore thoughtIndex updates from the remote thinking it is already up-to-speed
      // TODO: A root level lastClientId/lastUpdated is an overreaching solution.
      ...Object.keys(thoughtIndexUpdates).length > 0 ? {
        lastClientId: clientId,
        lastUpdated: timestamp()
      } : null
    } : {}
  }

  logWithTime('pushRemote: allUpdates')

  if (Object.keys(allUpdates).length > 0) {
    return getFirebaseProvider(state, dispatch).update(allUpdates)
      .catch((e: Error) => {
        dispatch(error({ value: e.message }))
        console.error(e.message, allUpdates)
        throw e
      })
  }
}

/** Syncs updates to local database and Firebase. */
const push = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, { local = true, remote = true, updates = {}, recentlyEdited = {} } = {}): Thunk => (dispatch, getState) => {

  const state = getState()
  const authenticated = { state }
  const userRef = getUserRef(state)

  return Promise.all([

    // push local
    local && pushLocal(thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates),

    // push remote
    remote && authenticated && userRef && pushRemote(thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, updates)(dispatch, getState),
  ])

}

export default push
