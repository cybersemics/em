/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { clientId } from '../browser'
import { EM_TOKEN } from '../constants'
import { getUserRef, hashContext, isFunction, logWithTime, timestamp } from '../util'
import { error } from '../action-creators'
import { Thunk, Index, Lexeme, Parent } from '../@types'
import { storage } from '../util/storage'

// store the hashes of the localStorage Settings contexts for quick lookup
// settings that are propagated to localStorage for faster load on startup
// e.g. {
//   [hashContext([EM_TOKEN, 'Settings', 'Tutorial'])]: 'Tutorial',
//   ...
// }
const localStorageSettingsContexts = _.keyBy(['Tutorial', 'Last Updated'], value =>
  hashContext([EM_TOKEN, 'Settings', value]),
)

/** Syncs thought updates to the local database. */
const pushLocal = (
  contextIndexUpdates: Index<Parent | null> = {},
  thoughtIndexUpdates: Index<Lexeme | null> = {},
  recentlyEdited: Index,
  updates: Index = {},
): Promise<any> => {
  // thoughtIndex
  const thoughtIndexPromises = [
    ...Object.entries(thoughtIndexUpdates).map(([key, lexeme]) => {
      if (lexeme != null) {
        return db.updateThought(key, lexeme)
      }
      return db.deleteThought(key)
    }),
    db.updateLastUpdated(timestamp()),
  ] as Promise<unknown>[]

  logWithTime('sync: thoughtIndexPromises generated')

  // contextIndex
  const contextIndexPromises = [
    ...Object.keys(contextIndexUpdates).map(contextEncoded => {
      const parentEntry = contextIndexUpdates[contextEncoded]

      // some settings are propagated to localStorage for faster load on startup
      const name = localStorageSettingsContexts[contextEncoded]
      if (name) {
        const firstChild = parentEntry?.children.find(child => !isFunction(child.value))
        if (firstChild) {
          storage.setItem(`Settings/${name}`, firstChild.value)
        }
      }

      return parentEntry?.children && parentEntry.children.length > 0
        ? db.updateContext(contextEncoded, parentEntry)
        : db.deleteContext(contextEncoded)
    }),
    db.updateLastUpdated(timestamp()),
  ]

  logWithTime('sync: contextIndexPromises generated')

  // recentlyEdited
  const recentlyEditedPromise = recentlyEdited ? db.updateRecentlyEdited(recentlyEdited) : null

  // schemaVersion
  const schemaVersionPromise = updates && updates.schemaVersion ? db.updateSchemaVersion(updates.schemaVersion) : null

  logWithTime('sync: localPromises generated')

  return Promise.all([...thoughtIndexPromises, ...contextIndexPromises, recentlyEditedPromise, schemaVersionPromise])
}

/** Prepends thoughtIndex and contextIndex keys for syncing to Firebase. */
const pushRemote =
  (
    contextIndexUpdates: Index<Parent | null> = {},
    thoughtIndexUpdates: Index<Lexeme | null> = {},
    recentlyEdited: Index | undefined,
    updates: Index = {},
  ): Thunk<Promise<unknown>> =>
  async (dispatch, getState) => {
    const state = getState()

    const hasUpdates =
      Object.keys(thoughtIndexUpdates).length > 0 ||
      Object.keys(contextIndexUpdates).length > 0 ||
      Object.keys(updates).length > 0

    // prepend thoughtIndex/ and encode key
    const prependedDataUpdates = _.transform(
      thoughtIndexUpdates,
      (accum: Index<Lexeme | null>, lexeme: Lexeme | null, key: string) => {
        if (!key) {
          console.error('Unescaped empty key', lexeme, new Error())
        }
      },
      {} as Index<Lexeme | null>,
    )

    logWithTime('pushRemote: prepend thoughtIndex key')

    const prependedContextIndexUpdates = _.transform(
      contextIndexUpdates,
      (accum, parentContext, key) => {
        // fix undefined/NaN rank
        const children = parentContext && parentContext.children
        accum['contextIndex/' + key] =
          children && children.length > 0
            ? {
                context: parentContext!.context,
                children,
                lastUpdated: parentContext!.lastUpdated || timestamp(),
              }
            : null
      },
      {} as Index<Parent | null>,
    )

    logWithTime('pushRemote: prepend contextIndex key')

    // add updates to queue appending clientId and timestamp
    const allUpdates = {
      // encode keys for firebase
      ...(hasUpdates
        ? {
            ...updates,
            ...prependedDataUpdates,
            ...prependedContextIndexUpdates,
            ...(recentlyEdited ? { recentlyEdited } : null),
            // do not update lastClientId and lastUpdated if there are no thoughtIndex updates (e.g. just a settings update)
            // there are some trivial settings updates that get pushed to the remote when the app loads, setting lastClientId and lastUpdated, which can cause the client to ignore thoughtIndex updates from the remote thinking it is already up-to-speed
            // TODO: A root level lastClientId/lastUpdated is an overreaching solution.
            ...(Object.keys(thoughtIndexUpdates).length > 0
              ? {
                  lastClientId: clientId,
                  lastUpdated: timestamp(),
                }
              : null),
          }
        : {}),
    }

    logWithTime('pushRemote: allUpdates')

    if (Object.keys(allUpdates).length > 0) {
      return getFirebaseProvider(state, dispatch)
        .update(allUpdates)
        .catch((e: Error) => {
          dispatch(error({ value: e.message }))
          console.error(e.message, allUpdates)
          throw e
        })
    }
  }

/** Syncs updates to local database and Firebase. */
const push =
  (
    contextIndexUpdates: Index<Parent | null> = {},
    thoughtIndexUpdates: Index<Lexeme | null> = {},
    { local = true, remote = true, updates = {}, recentlyEdited = {} } = {},
  ): Thunk =>
  (dispatch, getState) => {
    if (!local && !remote) {
      throw new Error('Invalid push. local and remote cannot both be false.')
    }

    const state = getState()
    const authenticated = { state }
    const userRef = getUserRef(state)

    // Filter out pending Parents so they are not persisted.
    // Why not filter them out upstream in updateThoughts? Pending Parents sometimes need to be saved to Redux state, such as during a 2-part move where the pending descendant in the source is still pending in the destination. So updateThoughts needs to be able to save pending thoughts. We could filter them out before adding them to the push batch, however that still leaves the chance that pull is called from somewhere else with pending thoughts. Filtering them out here is the safest choice.
    const contextIndexUpdatesNotPending = _.pickBy(contextIndexUpdates, parent => !parent?.pending)

    return Promise.all([
      // push local
      local && pushLocal(contextIndexUpdatesNotPending, thoughtIndexUpdates, recentlyEdited, updates),

      // push remote
      remote &&
        authenticated &&
        userRef &&
        pushRemote(contextIndexUpdatesNotPending, thoughtIndexUpdates, recentlyEdited, updates)(dispatch, getState),
    ])
  }

export default push
