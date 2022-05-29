import { decode as firebaseDecode } from 'firebase-encode'
import * as db from '../data-providers/dexie'
import { EMPTY_TOKEN, SCHEMA_HASHKEYS } from '../constants'
import { isDocumentEditable, keyValueBy, logWithTime } from '../util'
import { deleteData, updateThoughts } from '../action-creators'
import { Dispatch, Thunk, Index, Thought, State } from '../@types'

/** Save all firebase state to state and localStorage. */
export const loadState = async (dispatch: Dispatch, newState: State, oldState: State) => {
  // delete local thoughts that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated! <= newState.lastUpdated!) {
    Object.keys(oldState.thoughts.lexemeIndex).forEach(key => {
      if (!(key in newState.thoughts.lexemeIndex)) {
        // do not force render here, but after all values have been deleted
        dispatch(deleteData(oldState.thoughts.lexemeIndex[key].value))
      }
    })
  }

  logWithTime('loadRemoteState: local lexemeIndex entries deleted')

  // lexemeIndex
  // keyRaw is firebase encoded
  const lexemeIndexUpdates = keyValueBy(newState.thoughts.lexemeIndex, (keyRaw, lexemeNew) => {
    const key =
      newState.schemaVersion < SCHEMA_HASHKEYS ? (keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw)) : keyRaw
    const lexemeOld = oldState.thoughts.lexemeIndex[key]
    const updated = lexemeNew && (!lexemeOld || lexemeNew.lastUpdated > lexemeOld.lastUpdated)

    return updated ? { [key]: lexemeNew } : null
  })

  logWithTime('loadRemoteState: lexemeIndexUpdates generated')

  // update local database in background
  if (isDocumentEditable()) {
    db.updateLexemeIndex(lexemeIndexUpdates)
  }

  logWithTime('loadRemoteState: updateLexemeIndex')

  // contextEncodedRaw is firebase encoded
  const thoughtIndexUpdates: Index<Thought | null> = keyValueBy(
    newState.thoughts.thoughtIndex || {},
    (contextEncodedRaw, thoughtNew) => {
      const contextEncoded =
        newState.schemaVersion < SCHEMA_HASHKEYS
          ? contextEncodedRaw === EMPTY_TOKEN
            ? ''
            : firebaseDecode(contextEncodedRaw)
          : contextEncodedRaw
      const thoughtOld = oldState.thoughts.thoughtIndex[contextEncoded]
      const updated =
        !thoughtOld ||
        thoughtNew.lastUpdated > thoughtOld.lastUpdated ||
        // root will be empty but have a newer lastUpdated on a fresh start
        // WARNING: If children are added to the root before the remote state is loaded, they will be overwritten
        Object.keys(thoughtOld.childrenMap).length === 0

      // update if entry does not exist locally or is newer
      return updated ? { [contextEncoded]: thoughtNew } : null
    },
  )

  logWithTime('loadRemoteState: thoughtIndexUpdates generated')

  // update local database in background
  if (isDocumentEditable()) {
    db.updateThoughtIndex(thoughtIndexUpdates)
  }

  logWithTime('loadRemoteState: updateThoughtIndex')

  // delete local thoughtIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (oldState.lastUpdated! <= newState.lastUpdated!) {
    Object.keys(oldState.thoughts.thoughtIndex).forEach(contextEncoded => {
      if (!(contextEncoded in (newState.thoughts.thoughtIndex || {}))) {
        thoughtIndexUpdates[contextEncoded] = null
      }
    })
  }

  logWithTime('loadRemoteState: local thoughtIndex entries deleted')

  if (Object.keys(lexemeIndexUpdates).length > 0) {
    logWithTime('updateThoughts')
    dispatch(
      updateThoughts({
        lexemeIndexUpdates,
        thoughtIndexUpdates,
        recentlyEdited: newState.recentlyEdited,
        remote: false,
      }),
    )
  }

  logWithTime('loadRemoteState: updateThoughts')
}

/** Loads the new state. */
const loadRemoteState =
  (newState: State): Thunk =>
  (dispatch, getState) =>
    loadState(dispatch, newState, getState())

// disable migrations since they do not work with iterative loading

/** Migrates both the old state (local) and the new state (remote) before merging. */
// const loadRemoteState = newState => async (dispatch, getState) => {

//   const oldState = getState()
//   const { schemaVersion: schemaVersionOriginal } = newState

//   const [newStateUpdates/* , oldStateUpdates */] = await Promise.all([
//     migrate(newState),
//     // migrate(oldState),
//   ])

//   logWithTime('loadRemoteState: migrated')

//   const { lexemeIndexUpdates, thoughtIndexUpdates, schemaVersion } = newStateUpdates

//   // eslint-disable-next-line fp/no-let
//   let output = [newState, oldState]

//   // if the schema version changed, sync updates and pass the migrated state to loadState
//   if (schemaVersion > schemaVersionOriginal) {

//     const updateThoughtsArgs = {
//       thoughtIndexUpdates,
//       lexemeIndexUpdates,
//       remote: false,
//       updates: { schemaVersion },
//     }

//     const newStateMigrated = updateThoughts(newState, updateThoughtsArgs)
//     const oldStateMigrated = updateThoughts(oldState, updateThoughtsArgs)

//     dispatch({
//       type: 'updateThoughts',
//       ...updateThoughtsArgs,
//     })

//     output = [newStateMigrated, oldStateMigrated]
//   }

//   return loadState(dispatch, ...output)
// }

export default loadRemoteState
