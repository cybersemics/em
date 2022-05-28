/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import { clientId } from '../browser'
import { EM_TOKEN, EMPTY_TOKEN } from '../constants'
import { getUserRef, isFunction, logWithTime, timestamp } from '../util'
import { getSessionId } from '../util/sessionManager'
import { error } from '../action-creators'
import { Thunk, Index, Lexeme, Thought, State, ThoughtId } from '../@types'
import { storage } from '../util/storage'
import { contextToThoughtId } from '../selectors'

/** Syncs thought updates to the local database. */
const pushLocal = (
  state: State,
  thoughtIndexUpdates: Index<Thought | null> = {},
  lexemeIndexUpdates: Index<Lexeme | null> = {},
  recentlyEdited: Index,
  updates: Index = {},
  localStorageSettingsContexts: Index<string>,
): Promise<any> => {
  // lexemeIndex
  const lexemeIndexPromises = [
    ...Object.entries(lexemeIndexUpdates).map(([key, lexeme]) => {
      if (lexeme != null) {
        return db.updateLexeme(key, lexeme)
      }
      return db.deleteLexeme(key)
    }),
    db.updateLastUpdated(timestamp()),
  ] as Promise<unknown>[]

  logWithTime('sync: lexemeIndexPromises generated')

  const updatedThoughtIndex = {
    ...state.thoughts.thoughtIndex,
    ...thoughtIndexUpdates,
  }
  // thoughtIndex
  const thoughtIndexPromises = [
    ...Object.keys(thoughtIndexUpdates).map(id => {
      const thought = thoughtIndexUpdates[id]

      // some settings are propagated to localStorage for faster load on startup
      const name = localStorageSettingsContexts[id]
      if (name) {
        const firstChild = thought?.children.find(child => {
          const thought = updatedThoughtIndex[child]
          return thought && !isFunction(thought.value)
        })
        if (firstChild) {
          const thought = updatedThoughtIndex[firstChild]
          storage.setItem(`Settings/${name}`, thought!.value)
        }
      }

      return thought ? db.updateThought(id as ThoughtId, thought) : db.deleteThought(id)
    }),
    db.updateLastUpdated(timestamp()),
  ]

  logWithTime('sync: thoughtIndexPromises generated')

  // recentlyEdited
  const recentlyEditedPromise = recentlyEdited ? db.updateRecentlyEdited(recentlyEdited) : null

  // schemaVersion
  const schemaVersionPromise = updates && updates.schemaVersion ? db.updateSchemaVersion(updates.schemaVersion) : null

  logWithTime('sync: localPromises generated')

  return Promise.all([...lexemeIndexPromises, ...thoughtIndexPromises, recentlyEditedPromise, schemaVersionPromise])
}

/** Prepends lexemeIndex and thoughtIndex keys for syncing to Firebase. */
const pushRemote =
  (
    thoughtIndexUpdates: Index<Thought | null> = {},
    lexemeIndexUpdates: Index<Lexeme | null> = {},
    recentlyEdited: Index | undefined,
    updates: Index = {},
  ): Thunk<Promise<unknown>> =>
  async (dispatch, getState) => {
    const state = getState()

    const hasUpdates =
      Object.keys(lexemeIndexUpdates).length > 0 ||
      Object.keys(thoughtIndexUpdates).length > 0 ||
      Object.keys(updates).length > 0

    // prepend lexemeIndex/ and encode key
    const prependedDataUpdates = _.transform(
      lexemeIndexUpdates,
      (accum, lexemeUpdate, key) => {
        if (!key) {
          console.error('Unescaped empty key', lexemeUpdate, new Error())
        }
        accum['lexemeIndex/' + (key || EMPTY_TOKEN)] = lexemeUpdate
      },
      {} as Index<Lexeme | null>,
    )

    logWithTime('pushRemote: prepend lexemeIndex key')

    const prependedThoughtIndexUpdates = _.transform(
      thoughtIndexUpdates,
      (accum, thoughtUpdate, id) => {
        accum['thoughtIndex/' + id] = thoughtUpdate
          ? {
              // whitelist properties for persistence
              ...(_.pick(thoughtUpdate, ['id', 'value', 'parentId', 'rank', 'children']) as Thought),
              lastUpdated: thoughtUpdate.lastUpdated || timestamp(),
              ...(thoughtUpdate.archived ? { archived: thoughtUpdate.archived } : null),
              updatedBy: thoughtUpdate.updatedBy || getSessionId(),
            }
          : null
      },
      {} as Index<Thought | null>,
    )

    logWithTime('pushRemote: prepend thoughtIndex key')

    // add updates to queue appending clientId and timestamp
    const allUpdates = {
      // encode keys for firebase
      ...(hasUpdates
        ? {
            ...updates,
            ...prependedDataUpdates,
            ...prependedThoughtIndexUpdates,
            ...(recentlyEdited ? { recentlyEdited } : null),
            // do not update lastClientId and lastUpdated if there are no lexemeIndex updates (e.g. just a settings update)
            // there are some trivial settings updates that get pushed to the remote when the app loads, setting lastClientId and lastUpdated, which can cause the client to ignore lexemeIndex updates from the remote thinking it is already up-to-speed
            // TODO: A root level lastClientId/lastUpdated is an overreaching solution.
            ...(Object.keys(lexemeIndexUpdates).length > 0
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
    thoughtIndexUpdates: Index<Thought | null> = {},
    lexemeIndexUpdates: Index<Lexeme | null> = {},
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
    const thoughtIndexUpdatesNotPending = _.pickBy(thoughtIndexUpdates, thought => !thought?.pending)

    // store the hashes of the localStorage Settings contexts for quick lookup
    // settings that are propagated to localStorage for faster load on startup
    // e.g. {
    //   [contextToThoughtId([EM_TOKEN, 'Settings', 'Tutorial'])]: 'Tutorial',
    //   ...
    // }
    const localStorageSettingsContexts = ['Tutorial', 'Last Updated'].reduce((acc, value) => {
      const id = contextToThoughtId(state, [EM_TOKEN, 'Settings', value])
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
          thoughtIndexUpdatesNotPending,
          lexemeIndexUpdates,
          recentlyEdited,
          updates,
          localStorageSettingsContexts,
        ),

      // push remote
      remote &&
        authenticated &&
        userRef &&
        pushRemote(thoughtIndexUpdatesNotPending, lexemeIndexUpdates, recentlyEdited, updates)(dispatch, getState),
    ])
  }

export default push
