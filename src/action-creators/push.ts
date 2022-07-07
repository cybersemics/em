/* eslint-disable fp/no-mutating-methods */
import _ from 'lodash'
import DatabaseUpdates from '../@types/DatabaseUpdates'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'
import Thunk from '../@types/Thunk'
import error from '../action-creators/error'
import { clientId } from '../browser'
import { EMPTY_TOKEN, EM_TOKEN } from '../constants'
import * as db from '../data-providers/dexie'
import getFirebaseProvider from '../data-providers/firebase'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import { getUserRef } from '../util/getUserRef'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import { getSessionId } from '../util/sessionManager'
import storage from '../util/storage'
import timestamp from '../util/timestamp'

/** Filter out the properties that should not be saved to thoughts in the database. */
const thoughtToDb = (thought: Thought) =>
  _.pick(thought, ['id', 'lastUpdated', 'parentId', 'pending', 'rank', 'updatedBy', 'value'])

/** Filter out the properties that should not be saved to thought.childrenMap in the database. */
const childToDb = (thought: Thought) =>
  _.pick(thought, ['id', 'childrenMap', 'lastUpdated', 'parentId', 'pending', 'rank', 'updatedBy', 'value'])

/** Syncs thought updates to the local database. Caches updated localStorageSettingsContexts to local storage. */
const pushLocal = (
  state: State,
  thoughtIndexUpdates: Index<Thought | null> = {},
  lexemeIndexUpdates: Index<Lexeme | null> = {},
  recentlyEdited: Index,
  updates: Index = {},
  localStorageSettingsContexts: Index<string>,
): Promise<any> => {
  const updatedThoughtIndex = {
    ...state.thoughts.thoughtIndex,
    ...thoughtIndexUpdates,
  }
  const thoughtUpdates = keyValueBy(thoughtIndexUpdates, (id, thoughtUpdate) => {
    const thought = thoughtIndexUpdates[id]
    const thoughtWithChildren = thought
      ? ({
          ...thoughtToDb(thought),
          children: keyValueBy(getAllChildrenAsThoughts(state, thought.id), child => ({
            [child.id]: childToDb(child),
          })),
        } as ThoughtWithChildren)
      : null

    // some settings are propagated to localStorage for faster load on startup
    const name = localStorageSettingsContexts[id]
    if (name) {
      const firstChild = Object.values(thought?.childrenMap || {}).find(childId => {
        const thought = updatedThoughtIndex[childId]
        return thought && !isAttribute(thought.value)
      })
      if (firstChild) {
        const thought = updatedThoughtIndex[firstChild]
        storage.setItem(`Settings/${name}`, thought!.value)
      }
    }

    return { [id]: thoughtWithChildren }
  })

  // recentlyEdited
  // const recentlyEditedPromise = recentlyEdited ? db.updateRecentlyEdited(recentlyEdited) : null

  return db.updateThoughts(thoughtUpdates, lexemeIndexUpdates, updates.schemaVersion)
}

/** Prepends lexemeIndex and thoughtIndex keys for syncing to Firebase. */
const pushRemote =
  (
    thoughtIndexUpdates: Index<Thought | null> = {},
    lexemeIndexUpdates: Index<Lexeme | null> = {},
    recentlyEdited: Index | undefined,
    updates: DatabaseUpdates = {},
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

    const prependedThoughtIndexUpdates = _.transform(
      thoughtIndexUpdates,
      (accum, thoughtUpdate, id) => {
        const children = thoughtUpdate ? getAllChildrenAsThoughts(state, thoughtUpdate.id) : []
        const hasPendingChildren = children.some(child => child.pending)
        const thoughtWithChildren: Partial<ThoughtWithChildren> | null = thoughtUpdate
          ? {
              ...thoughtToDb(thoughtUpdate),
              ...(!hasPendingChildren
                ? {
                    children: keyValueBy(children, child => ({
                      [child.id]: childToDb(child),
                    })),
                  }
                : null),
              lastUpdated: thoughtUpdate.lastUpdated || timestamp(),
              updatedBy: thoughtUpdate.updatedBy || getSessionId(),
              ...(thoughtUpdate.archived ? { archived: thoughtUpdate.archived } : null),
            }
          : null
        // const parentWithChildren

        accum[`thoughtIndex/${id}`] = thoughtWithChildren || null
        // accum[`thoughtIndex/${parentId}`] = parentWithChildren || null
      },
      {} as Index<Partial<ThoughtWithChildren> | null>,
    )

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

    // update the inline children of each thought's parents
    // TODO: This can be done more efficiently if it is only updated if the parent children have changed
    // we can tell if a thought is deleted, but unfortunately we cannot tell if a thought has been added vs edited since state is already updated
    // may need to do a deep comparison of parent's old and new children
    const thoughtIndexUpdatesWithParents = keyValueBy(thoughtIndexUpdatesNotPending, (id, thoughtUpdate) => {
      // update inline children if a thought is added or deleted
      const parentThought = thoughtUpdate && getThoughtById(state, thoughtUpdate.parentId)
      return {
        ...(parentThought
          ? {
              [parentThought.id]: {
                ...parentThought,
                children: keyValueBy(getAllChildrenAsThoughts(state, parentThought.id), child => ({
                  [child.id]: childToDb(child),
                })),
              },
            }
          : null),
        [id]: thoughtUpdate,
      }
    })

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
          thoughtIndexUpdatesWithParents,
          lexemeIndexUpdates,
          recentlyEdited,
          updates,
          localStorageSettingsContexts,
        ),

      // push remote
      remote &&
        authenticated &&
        userRef &&
        pushRemote(thoughtIndexUpdatesWithParents, lexemeIndexUpdates, recentlyEdited, updates)(dispatch, getState),
    ])
  }

export default push
