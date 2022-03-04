/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { clientId } from '../browser'
import { EM_TOKEN, EMPTY_TOKEN } from '../constants'
import { getUserRef, getThoughtIdByContext, isFunction, logWithTime, timestamp } from '../util'
import { getSessionId } from '../util/sessionManager'
import { error } from '../action-creators'
import { Thunk, Index, Lexeme, Thought, State, ThoughtId } from '../@types'
import { storage } from '../util/storage'

/** Syncs thought updates to the local database. */
const pushLocal = (
  state: State,
  contextIndexUpdates: Index<Thought | null> = {},
  thoughtIndexUpdates: Index<Lexeme | null> = {},
  recentlyEdited: Index,
  updates: Index = {},
  localStorageSettingsContexts: Index<string>,
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

  const updatedContextIndex = {
    ...state.thoughts.contextIndex,
    ...contextIndexUpdates,
  }
  // contextIndex
  const contextIndexPromises = [
    ...Object.keys(contextIndexUpdates).map(contextEncoded => {
      const parentEntry = contextIndexUpdates[contextEncoded]

      // some settings are propagated to localStorage for faster load on startup
      const name = localStorageSettingsContexts[contextEncoded]
      if (name) {
        const firstChild = parentEntry?.children.find(child => {
          const thought = updatedContextIndex[child]
          return thought && !isFunction(thought.value)
        })
        if (firstChild) {
          const thought = updatedContextIndex[firstChild]
          storage.setItem(`Settings/${name}`, thought!.value)
        }
      }

      // Note: Since all the data of a thought is now on Parent instead of Child and ThoughtIndex, so the parent entry should not be deleted if they don't have children
      return parentEntry ? db.updateContext(contextEncoded as ThoughtId, parentEntry) : db.deleteContext(contextEncoded)
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
    contextIndexUpdates: Index<Thought | null> = {},
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
      (accum, lexemeUpdate, key) => {
        if (!key) {
          console.error('Unescaped empty key', lexemeUpdate, new Error())
        }
        accum['thoughtIndex/' + (key || EMPTY_TOKEN)] = lexemeUpdate
      },
      {} as Index<Lexeme | null>,
    )

    logWithTime('pushRemote: prepend thoughtIndex key')

    const prependedContextIndexUpdates = _.transform(
      contextIndexUpdates,
      (accum, parentUpdate, key) => {
        // fix undefined/NaN rank
        const children = parentUpdate && parentUpdate.children
        accum['contextIndex/' + key] =
          children && children.length > 0
            ? {
                id: parentUpdate!.id,
                value: parentUpdate!.value,
                parentId: parentUpdate!.parentId,
                lastUpdated: parentUpdate!.lastUpdated || timestamp(),
                ...(parentUpdate!.archived ? { archived: parentUpdate!.archived } : null),
                rank: parentUpdate!.rank,
                children,
                updatedBy: parentUpdate!.updatedBy || getSessionId(),
              }
            : null
      },
      {} as Index<Thought | null>,
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
    contextIndexUpdates: Index<Thought | null> = {},
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

    // Filter out pending Thoughts so they are not persisted.
    // Why not filter them out upstream in updateThoughts? Pending Thoughts sometimes need to be saved to Redux state, such as during a 2-part move where the pending descendant in the source is still pending in the destination. So updateThoughts needs to be able to save pending thoughts. We could filter them out before adding them to the push batch, however that still leaves the chance that pull is called from somewhere else with pending thoughts. Filtering them out here is the safest choice.
    const contextIndexUpdatesNotPending = _.pickBy(contextIndexUpdates, thought => !thought?.pending)

    // store the hashes of the localStorage Settings contexts for quick lookup
    // settings that are propagated to localStorage for faster load on startup
    // e.g. {
    //   [getThoughtIdByContext([EM_TOKEN, 'Settings', 'Tutorial'])]: 'Tutorial',
    //   ...
    // }
    const localStorageSettingsContexts = ['Tutorial', 'Last Updated'].reduce((acc, value) => {
      const id = getThoughtIdByContext(state, [EM_TOKEN, 'Settings', value])
      return {
        ...acc,
        ...(id
          ? {
              [id]: value,
            }
          : {}),
      }
    }, {})

    return Promise.all([
      // push local
      local &&
        pushLocal(
          getState(),
          contextIndexUpdatesNotPending,
          thoughtIndexUpdates,
          recentlyEdited,
          updates,
          localStorageSettingsContexts,
        ),

      // push remote
      remote &&
        authenticated &&
        userRef &&
        pushRemote(contextIndexUpdatesNotPending, thoughtIndexUpdates, recentlyEdited, updates)(dispatch, getState),
    ])
  }

export default push
