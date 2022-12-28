/* eslint-disable fp/no-mutating-methods */
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import { EM_TOKEN } from '../constants'
import db from '../data-providers/yjs/thoughtspace'
import contextToThoughtId from '../selectors/contextToThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import filterObject from '../util/filterObject'
import isAttribute from '../util/isAttribute'
import keyValueBy from '../util/keyValueBy'
import storage from '../util/storage'
import thoughtToDb from '../util/thoughtToDb'

/** Syncs thought updates to the local database. Caches updated localStorageSettingsContexts to local storage. */
const pushLocal = (
  state: State,
  thoughtIndexUpdates: Index<Thought | null> = {},
  lexemeIndexUpdates: Index<Lexeme | null> = {},
  recentlyEdited: Index,
  updates: Index = {},
  localStorageSettingsContexts: Index<string>,
): Promise<unknown> => {
  const updatedThoughtIndex = {
    ...state.thoughts.thoughtIndex,
    ...thoughtIndexUpdates,
  }
  const thoughtUpdates = keyValueBy(thoughtIndexUpdates, (id, thought) => {
    if (!thought) return { [id]: null }
    const thoughtDb = thoughtToDb(thought)

    // some settings are propagated to localStorage for faster load on startup
    const name = localStorageSettingsContexts[id]
    if (name) {
      const firstChild = Object.values(thought.childrenMap || {}).find(childId => {
        const child = updatedThoughtIndex[childId]
        return child && !isAttribute(child.value)
      })
      if (firstChild) {
        const thought = updatedThoughtIndex[firstChild]
        storage.setItem(`Settings/${name}`, thought!.value)
      }
    }

    return { [id]: thoughtDb }
  })

  // recentlyEdited
  // const recentlyEditedPromise = recentlyEdited ? db.updateRecentlyEdited(recentlyEdited) : null

  db.updateThoughts?.(thoughtUpdates, lexemeIndexUpdates, updates.schemaVersion)

  return Promise.resolve()
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

    // include the parents of the updated thoughts, since their inline children will be updated
    // converting childrenMap to children occurs in pushLocal and pushRemote
    // TODO: This can be done more efficiently if it is only updated if the parent children have changed
    // we can tell if a thought is deleted, but unfortunately we cannot tell if a thought has been added vs edited since state is already updated
    // may need to do a deep comparison of parent's old and new children
    const thoughtIndexUpdatesWithParents = keyValueBy<Thought | null, Thought | null>(
      thoughtIndexUpdates,
      (id, thoughtUpdate) => {
        // update inline children if a thought is added or deleted
        const parentThought = thoughtUpdate ? getThoughtById(state, thoughtUpdate.parentId) : null
        return {
          ...(parentThought ? { [parentThought.id]: parentThought } : null),
          [id]: thoughtUpdate,
        }
      },
    )

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

    // inlineChildrenDeletes are passed from updateThoughts to here, but they are not not completely safe for firebase.
    // If parentOld is deleted in another batch, it is possible to get a deletion update for a thought and a deletion update for its inline child at the same time, which will throw an error in firebase.
    // This occur when collapseContext leads to merged duplicate ancestors.
    // Remove inline children updates whose parents no longer exist
    const updatesValidated = filterObject(updates, (key, value) => {
      const idChildUpdate = key.match(/^thoughtIndex\/(.*)\/children/)?.[1]
      return !idChildUpdate || !!thoughtIndexUpdates[idChildUpdate]
    })

    // temporarily disable local push when logged in
    return local
      ? pushLocal(
          getState(),
          thoughtIndexUpdatesWithParents,
          lexemeIndexUpdates,
          recentlyEdited,
          updatesValidated,
          localStorageSettingsContexts,
        )
      : Promise.resolve()
  }

export default push
